import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';

import { Document, DocumentStatus } from './entities/document.entity';
import { DocumentVersion } from './entities/document-version.entity';
import { DocumentChunk } from './entities/document-chunk.entity';
import {
  DocumentAccessRule,
  ResourcePermission,
  PERMISSION_COVERS,
} from './entities/document-access.entity';
import { SaveChunksRequest } from './dto/request/save-chunks.request';
import { DocumentChunkResponse } from './dto/response/document-chunk.response';
import { UploadDocumentRequest } from './dto/request/upload-document.request';
import { UpdateDocumentRequest } from './dto/request/update-document.request';
import { UploadVersionRequest } from './dto/request/upload-version.request';
import { DocumentResponse } from './dto/response/document.response';
import { DocumentVersionResponse } from './dto/response/document-version.response';
import { TreeResponse } from '../folder/dto/response/tree.response';
import { ImageKitService } from '@modules/imagekit/imagekit.service';
import { ValidationException } from '@common/exceptions/validation.exception';
import { ErrorCode } from '@common/constants/error-code.constant';
import { FolderService } from '../folder/folder.service';
import { DocumentFolder } from '../folder/entities/document-folder.entity';
import { DOCUMENTS_DIR } from '@common/constants/folder/dir.constant';
import { AiDocumentSyncService } from '@modules/ai-internal/document/ai-document-sync.service';

@Injectable()
export class DocumentCoreService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,

    @InjectRepository(DocumentVersion)
    private readonly versionRepo: Repository<DocumentVersion>,

    @InjectRepository(DocumentChunk)
    private readonly chunkRepo: Repository<DocumentChunk>,

    @InjectRepository(DocumentAccessRule)
    private readonly docAccessRepo: Repository<DocumentAccessRule>,

    private readonly imagekitService: ImageKitService,
    private readonly folderService: FolderService,
    private readonly dataSource: DataSource,
    private readonly aiSync: AiDocumentSyncService,
  ) {}

  // ── Access Helpers ─────────────────────────────────────────────────────────

  /**
   * Trả về danh sách permission "đủ điều kiện" cho một action cụ thể,
   * dùng cho mệnh đề SQL IN (...).
   *
   * Ví dụ: coverSql(EDIT) → "'edit','manage'"
   */
  private coverSql(required: ResourcePermission): string {
    return PERMISSION_COVERS[required].map((p) => `'${p}'`).join(',');
  }

  private privateBoundarySql(docAlias = 'doc'): string {
    return `(
      ${docAlias}.access_scope = 'private'
      OR (
        ${docAlias}.access_scope = 'user'
        AND NOT EXISTS (
          SELECT 1
          FROM knowledge.document_access_rules dar_private
          WHERE dar_private.document_id = ${docAlias}.id
        )
      )
    )`;
  }

  /**
   * Truy vấn kiểm tra user có quyền `required` trên document không.
   *
   * Ưu tiên theo thứ tự:
   * 1. Người upload → implicit MANAGE (toàn quyền)
   * 2. accessScope = 'organization'|'system' → implicit VIEW
   * 3. Project member → implicit VIEW cho docs trong project folder
   * 4. Explicit document_access_rules với permission đủ điều kiện
   * 5. Folder access rule (kế thừa qua materialized path) với permission đủ điều kiện
   *
   * Throws ForbiddenException nếu không thoả mãn.
   */
  private async assertDocumentAccess(
    documentId: string,
    userId: string,
    required: ResourcePermission = ResourcePermission.VIEW,
  ): Promise<Document> {
    const permSql = this.coverSql(required);
    const privateScopeSql = this.privateBoundarySql('doc');

    // Điều kiện accessScope và project membership chỉ cho VIEW
    const scopeClause =
      required === ResourcePermission.VIEW
        ? `OR doc.access_scope IN ('organization', 'system')
           OR (
             doc.access_scope = 'project'
             AND
             doc.folder_id IS NOT NULL AND EXISTS (
               SELECT 1 FROM knowledge.document_folders df
               INNER JOIN project.project_members pm ON pm.project_id = df.project_id AND pm.user_id = :userId
               WHERE df.id = doc.folder_id AND df.project_id IS NOT NULL
             )
           )`
        : '';

    const qb = this.documentRepo
      .createQueryBuilder('doc')
      .where('doc.id = :documentId', { documentId })
      .andWhere(
        `(
          doc.uploaded_by = :userId
          ${scopeClause}
          OR EXISTS (
            SELECT 1 FROM knowledge.document_access_rules dar
            WHERE dar.document_id = doc.id
              AND dar.permission IN (${permSql})
              AND (
                (dar.access_type = 'user'    AND dar.access_id = :userId) OR
                (dar.access_type = 'role'    AND dar.access_id IN (
                  SELECT ur.role_id FROM rbac.user_roles ur WHERE ur.user_id = :userId
                )) OR
                (dar.access_type = 'project' AND dar.access_id IN (
                  SELECT pm.project_id FROM project.project_members pm WHERE pm.user_id = :userId
                ))
              )
          )
          OR (
            NOT ${privateScopeSql}
            AND
            doc.folder_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM knowledge.folder_access_rules far
              INNER JOIN knowledge.document_folders df ON df.id = doc.folder_id
              WHERE (
                far.folder_id = df.id
                OR (df.path IS NOT NULL AND df.path LIKE CONCAT('%', far.folder_id, '%'))
              )
                AND far.permission IN (${permSql})
                AND (
                  (far.access_type = 'user'    AND far.access_id = :userId) OR
                  (far.access_type = 'role'    AND far.access_id IN (
                    SELECT ur.role_id FROM rbac.user_roles ur WHERE ur.user_id = :userId
                  )) OR
                  (far.access_type = 'project' AND far.access_id IN (
                    SELECT pm.project_id FROM project.project_members pm WHERE pm.user_id = :userId
                  ))
                )
            )
          )
        )`,
        { userId },
      );

    const doc = await qb.getOne();
    if (!doc) throw new ForbiddenException('Access denied');
    return doc;
  }

  async ensureDocumentAccess(
    documentId: string,
    userId: string,
    required: ResourcePermission = ResourcePermission.VIEW,
  ): Promise<void> {
    await this.assertDocumentAccess(documentId, userId, required);
  }

  /**
   * Fragment SQL dùng trong findAll / getTree để filter documents theo VIEW.
   * accessScope='organization'|'system' → visible với mọi người trong org.
   * Project member → visible với mọi member của project chứa folder của doc.
   */
  private viewableWhere(): string {
    const permSql = this.coverSql(ResourcePermission.VIEW);
    const privateScopeSql = this.privateBoundarySql('doc');
    return `(
      doc.access_scope IN ('organization', 'system')
      OR doc.uploaded_by = :userId
      OR (
        doc.access_scope = 'project'
        AND
        doc.folder_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM knowledge.document_folders df
          INNER JOIN project.project_members pm ON pm.project_id = df.project_id AND pm.user_id = :userId
          WHERE df.id = doc.folder_id AND df.project_id IS NOT NULL
        )
      )
      OR EXISTS (
        SELECT 1 FROM knowledge.document_access_rules dar
        WHERE dar.document_id = doc.id
          AND dar.permission IN (${permSql})
          AND (
            (dar.access_type = 'user'    AND dar.access_id = :userId) OR
            (dar.access_type = 'role'    AND dar.access_id IN (
              SELECT ur.role_id FROM rbac.user_roles ur WHERE ur.user_id = :userId
            )) OR
            (dar.access_type = 'project' AND dar.access_id IN (
              SELECT pm.project_id FROM project.project_members pm WHERE pm.user_id = :userId
            ))
          )
      )
      OR (
        NOT ${privateScopeSql}
        AND
        doc.folder_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM knowledge.folder_access_rules far
          INNER JOIN knowledge.document_folders df ON df.id = doc.folder_id
          WHERE (
            far.folder_id = df.id
            OR (df.path IS NOT NULL AND df.path LIKE CONCAT('%', far.folder_id, '%'))
          )
            AND far.permission IN (${permSql})
            AND (
              (far.access_type = 'user'    AND far.access_id = :userId) OR
              (far.access_type = 'role'    AND far.access_id IN (
                SELECT ur.role_id FROM rbac.user_roles ur WHERE ur.user_id = :userId
              )) OR
              (far.access_type = 'project' AND far.access_id IN (
                SELECT pm.project_id FROM project.project_members pm WHERE pm.user_id = :userId
              ))
            )
        )
      )
    )`;
  }

  // ── Internal helpers ───────────────────────────────────────────────────────

  private async buildReadablePath(
    orgId: string | undefined,
    folderId?: string,
  ): Promise<string> {
    const basePath = orgId
      ? `/${DOCUMENTS_DIR}/${orgId}`
      : `/${DOCUMENTS_DIR}/system`;

    if (!folderId) return basePath;

    try {
      const folder = await this.folderService.findById(folderId);
      if (!folder.path) return basePath;

      const ids = folder.path.split('.');
      const names: string[] = [];
      for (const id of ids) {
        try {
          const f = await this.folderService.findById(id);
          names.push(f.name);
        } catch {
          // bỏ qua nếu folder cha bị xoá
        }
      }

      if (names.length > 0) return `${basePath}/${names.join('/')}`;
    } catch {
      // fallback về basePath
    }

    return basePath;
  }

  private async getFolderProjectId(
    folderId?: string,
  ): Promise<string | undefined> {
    if (!folderId) return undefined;
    const folder = await this.folderService.findById(folderId);
    return folder.projectId ?? undefined;
  }

  private normalizeUploadRules(
    accessScope: string,
    rules: UploadDocumentRequest['rules'],
    folderProjectId?: string,
  ): UploadDocumentRequest['rules'] {
    const incomingRules = rules ?? [];

    switch (accessScope) {
      case 'private':
      case 'organization':
      case 'system':
        return [];
      case 'user': {
        const userRules = incomingRules.filter(
          (rule) => rule.accessType === 'user',
        );
        return userRules;
      }
      case 'role': {
        const roleRules = incomingRules.filter(
          (rule) => rule.accessType === 'role',
        );
        if (!roleRules.length) {
          throw new BadRequestException(
            'At least one role access rule is required when accessScope=role',
          );
        }
        return roleRules;
      }
      case 'project': {
        const projectRules = incomingRules.filter(
          (rule) => rule.accessType === 'project',
        );
        if (!projectRules.length && !folderProjectId) {
          throw new BadRequestException(
            'At least one project access rule is required when accessScope=project outside a project folder',
          );
        }
        return projectRules;
      }
      default:
        return incomingRules;
    }
  }

  // ── Core CRUD ──────────────────────────────────────────────────────────────

  async upload(
    userId: string,
    orgId: string | undefined,
    file: Parameters<ImageKitService['uploadFile']>[0],
    dto: UploadDocumentRequest,
  ): Promise<DocumentResponse> {
    const folderProjectId = await this.getFolderProjectId(dto.folderId);
    const accessScope = dto.accessScope ?? 'organization';
    const normalizedRules = this.normalizeUploadRules(
      accessScope,
      dto.rules,
      folderProjectId,
    );
    const folder = await this.buildReadablePath(orgId, dto.folderId);

    let uploadResult: Awaited<
      ReturnType<typeof this.imagekitService.uploadFile>
    >;
    try {
      uploadResult = await this.imagekitService.uploadFile(file, folder);
    } catch (err: any) {
      Logger.error(
        `ImageKit upload failed: ${err?.message || err}`,
        err?.stack,
        'DocumentCoreService.upload',
      );
      throw new ValidationException(ErrorCode.DOC002);
    }

    return this.dataSource.transaction(async (manager) => {
      const doc = manager.create(Document, {
        organizationId: orgId ?? undefined,
        folderId: dto.folderId ?? undefined,
        categoryId: dto.categoryId ?? undefined,
        title: dto.title,
        description: dto.description,
        fileName: uploadResult.fileName,
        filePath: uploadResult.url,
        fileSize: uploadResult.size,
        fileType: uploadResult.extension,
        mimeType: file.mimetype,
        uploadedBy: userId,
        status: DocumentStatus.NOT_INDEXED,
        accessScope,
        version: 1,
        isActive: true,
      });
      const savedDoc = await manager.save(doc);

      // Version record đầu tiên
      const version = manager.create(DocumentVersion, {
        documentId: savedDoc.id,
        version: 1,
        filePath: uploadResult.url,
        fileName: uploadResult.fileName,
        fileSize: uploadResult.size,
        uploadedBy: userId,
        changeNotes: 'Initial upload',
      });
      await manager.save(version);

      // Pre-grant access rules nếu có (đã bao gồm permission từ AccessRuleItem)
      if (normalizedRules?.length) {
        const accessRules = normalizedRules.map((r) =>
          manager.create(DocumentAccessRule, {
            documentId: savedDoc.id,
            accessType: r.accessType,
            accessId: r.accessId,
            permission: r.permission ?? ResourcePermission.VIEW,
          }),
        );
        await manager.save(DocumentAccessRule, accessRules);
      }

      return plainToInstance(DocumentResponse, savedDoc, {
        excludeExtraneousValues: true,
      });
    });
  }

  async findAll(
    userId: string,
    orgId?: string,
    folderId?: string,
    categoryId?: string,
    projectId?: string,
  ): Promise<DocumentResponse[]> {
    const qb = this.documentRepo
      .createQueryBuilder('doc')
      .where('doc.is_active = true');

    if (orgId) {
      qb.andWhere('doc.organization_id = :orgId', { orgId });
    } else {
      qb.andWhere('doc.organization_id IS NULL');
    }

    if (folderId) qb.andWhere('doc.folder_id = :folderId', { folderId });
    if (categoryId)
      qb.andWhere('doc.category_id = :categoryId', { categoryId });

    // Khi có projectId, chỉ trả về docs thuộc folder của project đó
    if (projectId) {
      qb.innerJoin(
        DocumentFolder,
        'df_proj',
        'df_proj.id = doc.folder_id AND df_proj.project_id = :projectId',
        { projectId },
      );
    }

    qb.andWhere(this.viewableWhere(), { userId });
    qb.orderBy('doc.created_at', 'DESC');

    const docs = await qb.getMany();
    return plainToInstance(DocumentResponse, docs, {
      excludeExtraneousValues: true,
    });
  }

  async getTree(
    userId: string,
    orgId?: string,
    projectId?: string,
  ): Promise<TreeResponse> {
    const qb = this.documentRepo
      .createQueryBuilder('doc')
      .where('doc.is_active = true');

    if (orgId) {
      qb.andWhere('doc.organization_id = :orgId', { orgId });
    } else {
      qb.andWhere('doc.organization_id IS NULL');
    }

    // Khi có projectId, chỉ lấy docs thuộc folder của project — loại bỏ org docs khỏi project tree
    if (projectId) {
      qb.innerJoin(
        DocumentFolder,
        'df_proj',
        'df_proj.id = doc.folder_id AND df_proj.project_id = :projectId',
        { projectId },
      );
    }

    qb.andWhere(this.viewableWhere(), { userId });
    qb.orderBy('doc.created_at', 'DESC');

    const documents = await qb.getMany();
    return this.folderService.buildTree(userId, orgId, projectId, documents);
  }

  async findById(
    documentId: string,
    userId: string,
  ): Promise<DocumentResponse> {
    const doc = await this.assertDocumentAccess(
      documentId,
      userId,
      ResourcePermission.VIEW,
    );
    if (!doc.isActive) throw new ValidationException(ErrorCode.DOC001);

    const accessRules = await this.docAccessRepo.find({
      where: { documentId },
    });

    return plainToInstance(
      DocumentResponse,
      { ...doc, accessRules },
      { excludeExtraneousValues: true },
    );
  }

  async update(
    documentId: string,
    userId: string,
    dto: UpdateDocumentRequest,
  ): Promise<DocumentResponse> {
    // Cần quyền EDIT để sửa metadata
    const doc = await this.assertDocumentAccess(
      documentId,
      userId,
      ResourcePermission.EDIT,
    );
    if (!doc.isActive) throw new ValidationException(ErrorCode.DOC001);

    // Track ACL-affecting changes before saving
    const metadataChanged =
      (dto.accessScope !== undefined && dto.accessScope !== doc.accessScope) ||
      (dto.folderId !== undefined && dto.folderId !== doc.folderId);

    if (dto.title !== undefined) doc.title = dto.title;
    if (dto.description !== undefined) doc.description = dto.description;
    if (dto.folderId !== undefined) doc.folderId = dto.folderId;
    if (dto.categoryId !== undefined) doc.categoryId = dto.categoryId;
    if (dto.accessScope !== undefined) doc.accessScope = dto.accessScope;

    const saved = await this.documentRepo.save(doc);

    // Sync Pinecone/OpenSearch metadata khi accessScope hoặc folderId thay đổi.
    // Fire-and-forget — batch-access-check vẫn là source of truth.
    if (metadataChanged && doc.status === 'indexed') {
      void this.aiSync
        .syncDocumentMetadata(documentId, {
          accessScope: dto.accessScope,
          folderId: dto.folderId,
        })
        .catch(() => undefined);
    }

    return plainToInstance(DocumentResponse, saved, {
      excludeExtraneousValues: true,
    });
  }

  async deactivate(documentId: string, userId: string): Promise<void> {
    // Cần quyền MANAGE để xoá (soft delete)
    const doc = await this.assertDocumentAccess(
      documentId,
      userId,
      ResourcePermission.MANAGE,
    );
    if (!doc.isActive) throw new ValidationException(ErrorCode.DOC001);

    doc.isActive = false;
    await this.documentRepo.save(doc);
  }

  async findRecovery(
    userId: string,
    orgId?: string,
  ): Promise<DocumentResponse[]> {
    const qb = this.documentRepo
      .createQueryBuilder('doc')
      .where('doc.is_active = false');

    if (orgId) {
      qb.andWhere('doc.organization_id = :orgId', { orgId });
    } else {
      qb.andWhere('doc.organization_id IS NULL');
    }

    // Chỉ trả về docs mà user có ít nhất VIEW permission
    qb.andWhere(this.viewableWhere(), { userId });
    qb.orderBy('doc.updated_at', 'DESC');

    const docs = await qb.getMany();
    return plainToInstance(DocumentResponse, docs, {
      excludeExtraneousValues: true,
    });
  }

  async restore(documentId: string, userId: string): Promise<DocumentResponse> {
    // Cần quyền MANAGE để restore
    const doc = await this.assertDocumentAccess(
      documentId,
      userId,
      ResourcePermission.MANAGE,
    );
    if (doc.isActive) throw new ValidationException(ErrorCode.DOC001);

    doc.isActive = true;
    const saved = await this.documentRepo.save(doc);
    return plainToInstance(DocumentResponse, saved, {
      excludeExtraneousValues: true,
    });
  }

  async deletePermanent(documentId: string, userId: string): Promise<void> {
    // Cần quyền MANAGE để xoá vĩnh viễn
    const doc = await this.assertDocumentAccess(
      documentId,
      userId,
      ResourcePermission.MANAGE,
    );
    if (doc.isActive) throw new ValidationException(ErrorCode.DOC001);

    const versions = await this.versionRepo.find({ where: { documentId } });

    // Xoá file trên ImageKit song song (không fail cả process nếu 1 file lỗi)
    await Promise.all(
      versions.map((v) =>
        this.imagekitService
          .deleteFileByUrl({ url: v.filePath })
          .catch((err) => {
            console.error(`Failed to delete ImageKit file: ${v.filePath}`, err);
          }),
      ),
    );

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(DocumentVersion, { documentId });
      await manager.delete(Document, { id: documentId });
    });

    // Xóa vectors trong Pinecone + OpenSearch sau khi DB delete thành công.
    // Fire-and-forget — không block response, không throw nếu be_ai lỗi.
    void this.aiSync
      .deleteDocumentVectors(documentId, doc.organizationId ?? '')
      .catch(() => undefined);
  }

  // ── Versioning ─────────────────────────────────────────────────────────────

  async uploadNewVersion(
    documentId: string,
    userId: string,
    file: Parameters<ImageKitService['uploadFile']>[0],
    dto: UploadVersionRequest,
  ): Promise<DocumentVersionResponse> {
    // Cần quyền UPLOAD để tạo version mới
    const doc = await this.assertDocumentAccess(
      documentId,
      userId,
      ResourcePermission.UPLOAD,
    );
    if (!doc.isActive) throw new ValidationException(ErrorCode.DOC001);

    const folder = await this.buildReadablePath(
      doc.organizationId,
      doc.folderId,
    );

    let uploadResult: Awaited<
      ReturnType<typeof this.imagekitService.uploadFile>
    >;
    try {
      uploadResult = await this.imagekitService.uploadFile(file, folder);
    } catch (err: any) {
      Logger.error(
        `ImageKit upload failed: ${err?.message || err}`,
        err?.stack,
        'DocumentCoreService.uploadVersion',
      );
      throw new ValidationException(ErrorCode.DOC002);
    }

    return this.dataSource.transaction(async (manager) => {
      const newVersionNumber = doc.version + 1;

      const versionRecord = manager.create(DocumentVersion, {
        documentId: doc.id,
        version: newVersionNumber,
        filePath: uploadResult.url,
        fileName: uploadResult.fileName,
        fileSize: uploadResult.size,
        uploadedBy: userId,
        changeNotes: dto.changeNotes,
      });
      const savedVersion = await manager.save(versionRecord);

      // Cập nhật document trỏ sang file mới, reset status để AI re-index
      doc.filePath = uploadResult.url;
      doc.fileName = uploadResult.fileName;
      doc.fileSize = uploadResult.size;
      doc.version = newVersionNumber;
      doc.status = DocumentStatus.PENDING;
      doc.indexedAt = undefined;
      await manager.save(doc);

      return plainToInstance(DocumentVersionResponse, savedVersion, {
        excludeExtraneousValues: true,
      });
    });
  }

  async findVersions(
    documentId: string,
    userId: string,
  ): Promise<DocumentVersionResponse[]> {
    await this.assertDocumentAccess(
      documentId,
      userId,
      ResourcePermission.VIEW,
    );

    const versions = await this.versionRepo.find({
      where: { documentId },
      order: { version: 'DESC' },
    });

    return plainToInstance(DocumentVersionResponse, versions, {
      excludeExtraneousValues: true,
    });
  }

  // ── Chunks ─────────────────────────────────────────────────────────────────

  async saveChunks(documentId: string, dto: SaveChunksRequest): Promise<void> {
    const doc = await this.documentRepo.findOne({ where: { id: documentId } });
    if (!doc) throw new ValidationException(ErrorCode.DOC001);

    await this.chunkRepo.delete({ documentId });
    const entities = dto.chunks.map((c) =>
      this.chunkRepo.create({
        documentId,
        chunkIndex: c.chunkIndex,
        content: c.content,
        tokenCount: c.tokenCount,
        metadata: c.metadata,
      }),
    );
    await this.chunkRepo.save(entities);
  }

  async getChunks(
    documentId: string,
    userId: string,
  ): Promise<DocumentChunkResponse[]> {
    await this.assertDocumentAccess(
      documentId,
      userId,
      ResourcePermission.VIEW,
    );

    const chunks = await this.chunkRepo.find({
      where: { documentId },
      order: { chunkIndex: 'ASC' },
    });
    return plainToInstance(DocumentChunkResponse, chunks, {
      excludeExtraneousValues: true,
    });
  }
}
