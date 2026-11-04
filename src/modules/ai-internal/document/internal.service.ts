import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Document,
  DocumentStatus,
} from '@modules/document/core/entities/document.entity';
import { DocumentFolder } from '@modules/document/folder/entities/document-folder.entity';
import { BatchAccessCheckRequest } from './dto/request/batch-access-check.request';
import { AiInternalBatchAccessCheckResponse } from './dto/response/batch-access-check.response';
import { AiInternalDocumentInfoResponse } from './dto/response/document-info.response';
import { AiInternalSyncMetadataResponse } from './dto/response/sync-metadata.response';
import { AiInternalUpdateStatusResponse } from './dto/response/update-status.response';
import {
  PERMISSION_COVERS,
  ResourcePermission,
} from '@modules/document/core/entities/document-access.entity';

@Injectable()
export class AiInternalDocumentService {
  private static readonly EMPTY_UUID_SENTINEL =
    '00000000-0000-0000-0000-000000000000';

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

  private coverSql(required: ResourcePermission): string {
    return PERMISSION_COVERS[required].map((p) => `'${p}'`).join(',');
  }

  constructor(
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    @InjectRepository(DocumentFolder)
    private readonly folderRepo: Repository<DocumentFolder>,
  ) {}

  async getDocumentInfo(id: string): Promise<AiInternalDocumentInfoResponse> {
    const doc = await this.documentRepo.findOne({ where: { id } });
    if (!doc) throw new NotFoundException(`Document ${id} not found`);

    const folder = doc.folderId
      ? await this.folderRepo.findOne({
          where: { id: doc.folderId },
          select: {
            id: true,
            path: true,
            projectId: true,
          },
        })
      : null;

    const folderPathIds = folder?.path
      ? folder.path
          .split('.')
          .map((value) => value.trim())
          .filter(Boolean)
      : doc.folderId
        ? [doc.folderId]
        : [];

    return {
      id: doc.id,
      organizationId: doc.organizationId,
      title: doc.title,
      filePath: doc.filePath,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      fileType: doc.fileType,
      accessScope: doc.accessScope,
      folderId: doc.folderId,
      folderPathIds,
      projectId: folder?.projectId,
      categoryId: doc.categoryId,
      uploadedBy: doc.uploadedBy,
      isActive: doc.isActive,
      status: doc.status,
      version: doc.version,
    };
  }

  async updateStatus(
    id: string,
    status: DocumentStatus,
    errorMessage?: string,
    indexedChunks?: number,
  ): Promise<AiInternalUpdateStatusResponse> {
    const doc = await this.documentRepo.findOne({ where: { id } });
    if (!doc) throw new NotFoundException(`Document ${id} not found`);

    doc.status = status;

    if (status === DocumentStatus.INDEXED) {
      doc.indexedAt = new Date();
    }

    if (errorMessage) {
      doc.metadata = { ...(doc.metadata ?? {}), lastError: errorMessage };
    }

    if (indexedChunks !== undefined) {
      doc.metadata = { ...(doc.metadata ?? {}), indexedChunks };
    }

    await this.documentRepo.save(doc);
    return { updated: true };
  }

  async batchAccessCheck(
    dto: BatchAccessCheckRequest,
  ): Promise<AiInternalBatchAccessCheckResponse> {
    if (!dto.documentIds.length) return { allowed: [], denied: [] };

    const privateScopeSql = this.privateBoundarySql('doc');
    const requiredPermission =
      (dto.requiredPermission as ResourcePermission | undefined) ??
      ResourcePermission.VIEW;
    const permSql = this.coverSql(requiredPermission);
    const viewScopeSql =
      requiredPermission === ResourcePermission.VIEW
        ? `doc.access_scope IN ('organization', 'system')
          OR (
            doc.access_scope = 'project'
            AND
            doc.folder_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM knowledge.document_folders df
              INNER JOIN project.project_members pm
                ON pm.project_id = df.project_id AND pm.user_id = :userId
              WHERE df.id = doc.folder_id AND df.project_id IS NOT NULL
            )
          )
          OR`
        : '';
    const roleIds = dto.roleIds?.length
      ? dto.roleIds
      : [AiInternalDocumentService.EMPTY_UUID_SENTINEL];
    const projectIds = dto.projectIds?.length
      ? dto.projectIds
      : [AiInternalDocumentService.EMPTY_UUID_SENTINEL];

    const qb = this.documentRepo
      .createQueryBuilder('doc')
      .select('doc.id')
      .where('doc.id IN (:...ids)', { ids: dto.documentIds })
      .andWhere('doc.is_active = true')
      .andWhere('doc.organization_id = :orgId', { orgId: dto.organizationId })
      .andWhere(
        `(
          ${viewScopeSql}
          doc.uploaded_by = :userId
          OR EXISTS (
            SELECT 1 FROM knowledge.document_access_rules dar
            WHERE dar.document_id = doc.id
              AND dar.permission IN (${permSql})
              AND (
                (dar.access_type = 'user'    AND dar.access_id = :userId) OR
                (dar.access_type = 'role'    AND (
                  dar.access_id IN (:...roleIds)
                  OR dar.access_id IN (
                    SELECT ur.role_id FROM rbac.user_roles ur WHERE ur.user_id = :userId
                  )
                )) OR
                (dar.access_type = 'project' AND (
                  dar.access_id IN (:...projectIds)
                  OR dar.access_id IN (
                    SELECT pm.project_id FROM project.project_members pm WHERE pm.user_id = :userId
                  )
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
                (far.access_type = 'role'    AND (
                  far.access_id IN (:...roleIds)
                  OR far.access_id IN (
                    SELECT ur.role_id FROM rbac.user_roles ur WHERE ur.user_id = :userId
                  )
                )) OR
                (far.access_type = 'project' AND (
                  far.access_id IN (:...projectIds)
                  OR far.access_id IN (
                    SELECT pm.project_id FROM project.project_members pm WHERE pm.user_id = :userId
                  )
                ))
              )
            )
          )
        )`,
        { userId: dto.userId, roleIds, projectIds },
      );

    const allowedDocs = await qb.getMany();
    const allowedIds = new Set(allowedDocs.map((d) => d.id));
    const denied = dto.documentIds.filter((id) => !allowedIds.has(id));

    return { allowed: [...allowedIds], denied };
  }

  async syncMetadata(
    id: string,
    accessScope?: string,
    folderId?: string,
  ): Promise<AiInternalSyncMetadataResponse> {
    const doc = await this.documentRepo.findOne({ where: { id } });
    if (!doc) return { synced: false };

    if (accessScope !== undefined) doc.accessScope = accessScope;
    if (folderId !== undefined) doc.folderId = folderId;

    await this.documentRepo.save(doc);
    return { synced: true };
  }
}
