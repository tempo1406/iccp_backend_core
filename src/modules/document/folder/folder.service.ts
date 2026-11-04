import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';

import { DocumentFolder } from './entities/document-folder.entity';
import { FolderAccessRule } from './entities/folder-access.entity';
import { CreateFolderRequest } from './dto/request/create-folder.request';
import { UpdateFolderRequest } from './dto/request/update-folder.request';
import { MoveFolderRequest } from './dto/request/move-folder.request';
import { FolderOrderItem } from './dto/request/reorder-folders.request';
import { FolderResponse } from './dto/response/folder.response';
import {
  TreeResponse,
  FolderTreeResponse,
  DocumentSummaryResponse,
} from './dto/response/tree.response';
import { ValidationException } from '@common/exceptions/validation.exception';
import { ErrorCode } from '@common/constants/error-code.constant';
import {
  ResourcePermission,
  PERMISSION_COVERS,
} from '../core/entities/document-access.entity';
import { Document } from '../core/entities/document.entity';
import { DocumentVersion } from '../core/entities/document-version.entity';
import { DocumentChunk } from '../core/entities/document-chunk.entity';
import { DocumentAccessRule } from '../core/entities/document-access.entity';
import { ImageKitService } from '@modules/imagekit/imagekit.service';

@Injectable()
export class FolderService {
  constructor(
    @InjectRepository(DocumentFolder)
    private readonly folderRepo: Repository<DocumentFolder>,
    @InjectRepository(FolderAccessRule)
    private readonly folderAccessRepo: Repository<FolderAccessRule>,
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    @InjectRepository(DocumentVersion)
    private readonly versionRepo: Repository<DocumentVersion>,
    @InjectRepository(DocumentChunk)
    private readonly chunkRepo: Repository<DocumentChunk>,
    @InjectRepository(DocumentAccessRule)
    private readonly docAccessRepo: Repository<DocumentAccessRule>,
    private readonly imagekitService: ImageKitService,
    private readonly dataSource: DataSource,
  ) {}

  // ── Access helpers ──────────────────────────────────────────────────────────

  private coverSql(required: ResourcePermission): string {
    return PERMISSION_COVERS[required].map((p) => `'${p}'`).join(',');
  }

  private buildFolderVisibilityClause(
    userIdParam = ':userId',
    projectScoped = false,
  ): string {
    const viewPermSql = this.coverSql(ResourcePermission.VIEW);
    const managePermSql = this.coverSql(ResourcePermission.MANAGE);

    const recoveryRestriction = `(
      folder.isSystem = false
      OR folder.name <> 'Recovery'
      OR folder.createdBy = ${userIdParam}
      OR EXISTS (
        SELECT 1 FROM knowledge.folder_access_rules far_manage
        WHERE far_manage.folder_id = folder.id
          AND far_manage.permission IN (${managePermSql})
          AND (
            (far_manage.access_type = 'user' AND far_manage.access_id = ${userIdParam}) OR
            (far_manage.access_type = 'role' AND far_manage.access_id IN (
              SELECT ur.role_id FROM rbac.user_roles ur WHERE ur.user_id = ${userIdParam}
            )) OR
            (far_manage.access_type = 'project' AND far_manage.access_id IN (
              SELECT pm.project_id FROM project.project_members pm WHERE pm.user_id = ${userIdParam}
            ))
          )
      )
    )`;

    if (projectScoped) {
      return `(
        (
          folder.createdBy = ${userIdParam}
          OR (
            folder.projectId IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM project.project_members pm
              WHERE pm.project_id = folder.projectId AND pm.user_id = ${userIdParam}
            )
          )
          OR EXISTS (
            SELECT 1 FROM knowledge.folder_access_rules far
            INNER JOIN knowledge.document_folders f ON folder.id = f.id OR folder.path LIKE CONCAT('%', f.id, '%')
            WHERE far.folder_id = f.id
              AND far.permission IN (${viewPermSql})
              AND (
                (far.access_type = 'user' AND far.access_id = ${userIdParam}) OR
                (far.access_type = 'role' AND far.access_id IN (
                  SELECT role_id FROM rbac.user_roles ur WHERE ur.user_id = ${userIdParam}
                )) OR
                (far.access_type = 'project' AND far.access_id IN (
                  SELECT project_id FROM project.project_members pm WHERE pm.user_id = ${userIdParam}
                ))
              )
          )
        )
        AND ${recoveryRestriction}
      )`;
    }

    return `(
      (
        folder.createdBy = ${userIdParam}
        OR EXISTS (
          SELECT 1 FROM knowledge.folder_access_rules far
          INNER JOIN knowledge.document_folders f ON folder.id = f.id OR folder.path LIKE CONCAT('%', f.id, '%')
          WHERE far.folder_id = f.id
            AND far.permission IN (${viewPermSql})
            AND (
              (far.access_type = 'user' AND far.access_id = ${userIdParam}) OR
              (far.access_type = 'role' AND far.access_id IN (
                SELECT role_id FROM rbac.user_roles ur WHERE ur.user_id = ${userIdParam}
              )) OR
              (far.access_type = 'project' AND far.access_id IN (
                SELECT project_id FROM project.project_members pm WHERE pm.user_id = ${userIdParam}
              ))
            )
        )
        OR NOT EXISTS (
          SELECT 1 FROM knowledge.folder_access_rules far
          INNER JOIN knowledge.document_folders f ON folder.id = f.id OR folder.path LIKE CONCAT('%', f.id, '%')
          WHERE far.folder_id = f.id
        )
      )
      AND ${recoveryRestriction}
    )`;
  }

  /**
   * Kiểm tra user có quyền `required` trên folder không.
   * - Người tạo folder → implicit MANAGE
   * - Folder không có rule nào → mở cho VIEW (mọi người thấy)
   * - Explicit folder_access_rules với permission đủ điều kiện
   */
  async assertFolderAccess(
    folderId: string,
    userId: string,
    required: ResourcePermission = ResourcePermission.VIEW,
  ): Promise<DocumentFolder> {
    const folder = await this.folderRepo.findOne({ where: { id: folderId } });
    if (!folder) throw new ValidationException(ErrorCode.DF001);

    // Người tạo có toàn quyền
    if (folder.createdBy === userId) return folder;

    // VIEW: nếu folder không có rule nào → mở cho tất cả
    if (required === ResourcePermission.VIEW) {
      const hasAnyRule = await this.folderAccessRepo.count({
        where: { folderId },
      });
      if (hasAnyRule === 0) return folder;
    }

    // Kiểm tra explicit access rule
    const permSql = this.coverSql(required);
    const result = await this.dataSource.query(
      `SELECT 1 FROM knowledge.folder_access_rules far
       WHERE far.folder_id = $1
         AND far.permission IN (${permSql})
         AND (
           (far.access_type = 'user'    AND far.access_id = $2) OR
           (far.access_type = 'role'    AND far.access_id IN (
             SELECT ur.role_id FROM rbac.user_roles ur WHERE ur.user_id = $2
           )) OR
           (far.access_type = 'project' AND far.access_id IN (
             SELECT pm.project_id FROM project.project_members pm WHERE pm.user_id = $2
           ))
         )
       LIMIT 1`,
      [folderId, userId],
    );

    if (!result?.length) throw new ForbiddenException('Access denied');
    return folder;
  }

  async create(
    userId: string,
    orgId: string | undefined,
    dto: CreateFolderRequest,
  ): Promise<FolderResponse> {
    try {
      let parentPath: string | undefined;

      if (dto.parentId) {
        // Cần ít nhất UPLOAD để tạo subfolder bên trong parent folder
        const parent = await this.assertFolderAccess(
          dto.parentId,
          userId,
          ResourcePermission.UPLOAD,
        );
        parentPath = parent.path;

        // Ensure child folder shares the same scope (project/org) as parent
        if (parent.organizationId !== (orgId ?? null))
          throw new ValidationException(ErrorCode.DF004);
        if (parent.projectId !== (dto.projectId ?? null))
          throw new ValidationException(ErrorCode.DF004);
      }

      // Validate name collision in the same level
      const duplicateQuery = this.folderRepo
        .createQueryBuilder('folder')
        .where('folder.name = :name', { name: dto.name });

      if (dto.parentId) {
        duplicateQuery.andWhere('folder.parentId = :parentId', {
          parentId: dto.parentId,
        });
      } else {
        duplicateQuery
          .andWhere('folder.parentId IS NULL')
          .andWhere(
            orgId
              ? 'folder.organizationId = :orgId'
              : 'folder.organizationId IS NULL',
            { orgId },
          )
          .andWhere(
            dto.projectId
              ? 'folder.projectId = :projectId'
              : 'folder.projectId IS NULL',
            { projectId: dto.projectId },
          );
      }

      const isDuplicate = await duplicateQuery.getOne();
      if (isDuplicate) throw new ValidationException(ErrorCode.DF005); // Use DF005 or equivalent for name collision

      // Auto-assign sortOrder: max(siblings) + 1, unless caller explicitly provided one
      let nextSortOrder = dto.sortOrder;
      if (nextSortOrder === undefined) {
        const siblingSortQuery = this.folderRepo.createQueryBuilder('folder');
        if (dto.parentId) {
          siblingSortQuery.where('folder.parentId = :parentId', {
            parentId: dto.parentId,
          });
        } else {
          siblingSortQuery.where('folder.parentId IS NULL');
          if (orgId) {
            siblingSortQuery.andWhere('folder.organizationId = :orgId', {
              orgId,
            });
          } else {
            siblingSortQuery.andWhere('folder.organizationId IS NULL');
          }
          if (dto.projectId) {
            siblingSortQuery.andWhere('folder.projectId = :projectId', {
              projectId: dto.projectId,
            });
          } else {
            siblingSortQuery.andWhere('folder.projectId IS NULL');
          }
        }
        const maxResult = await siblingSortQuery
          .select('MAX(folder.sortOrder)', 'maxOrder')
          .getRawOne<{ maxOrder: number | null }>();
        nextSortOrder = (maxResult?.maxOrder ?? -1) + 1;
      }

      return await this.dataSource.transaction(async (manager) => {
        const folder = manager.create(DocumentFolder, {
          organizationId: orgId ?? undefined,
          projectId: dto.projectId ?? undefined,
          name: dto.name,
          description: dto.description,
          parentId: dto.parentId ?? undefined,
          sortOrder: nextSortOrder,
          createdBy: userId,
          isSystem: false,
        });
        const saved = await manager.save(folder);

        // Tính path sau khi có id
        saved.path = parentPath ? `${parentPath}.${saved.id}` : saved.id;
        await manager.save(saved);

        return plainToInstance(FolderResponse, saved, {
          excludeExtraneousValues: true,
        });
      });
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  }

  // Lấy tất cả root folders của org (parent_id IS NULL)
  async findRoots(
    userId: string,
    orgId?: string,
    projectId?: string,
  ): Promise<FolderResponse[]> {
    try {
      const qb = this.folderRepo
        .createQueryBuilder('folder')
        .where('folder.parentId IS NULL');

      if (orgId) {
        qb.andWhere('folder.organizationId = :orgId', { orgId });
      } else {
        qb.andWhere('folder.organizationId IS NULL');
      }

      if (projectId) {
        qb.andWhere('folder.projectId = :projectId', { projectId });
      } else {
        qb.andWhere('folder.projectId IS NULL');
      }

      qb.andWhere(
        this.buildFolderVisibilityClause(':userId', Boolean(projectId)),
        {
          userId,
        },
      );
      qb.orderBy('folder.sortOrder', 'ASC').addOrderBy('folder.name', 'ASC');

      const folders = await qb.getMany();

      return plainToInstance(FolderResponse, folders, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      console.error('Error finding root folders:', error);
      throw error;
    }
  }

  // Lấy tất cả folders của org (phục vụ build Tree)
  async findAllFolders(
    userId: string,
    orgId?: string,
    projectId?: string,
  ): Promise<DocumentFolder[]> {
    try {
      const qb = this.folderRepo.createQueryBuilder('folder');

      if (orgId) {
        qb.andWhere('folder.organizationId = :orgId', { orgId });
      } else {
        qb.andWhere('folder.organizationId IS NULL');
      }

      if (projectId) {
        qb.andWhere('folder.projectId = :projectId', { projectId });
      } else {
        qb.andWhere('folder.projectId IS NULL');
      }

      qb.andWhere(
        this.buildFolderVisibilityClause(':userId', Boolean(projectId)),
        {
          userId,
        },
      );
      qb.orderBy('folder.sortOrder', 'ASC').addOrderBy('folder.name', 'ASC');

      return await qb.getMany();
    } catch (error) {
      console.error('Error finding all folders:', error);
      throw error;
    }
  }

  // Lắp rắp mảng folders và documents thành cấu trúc cây lồng nhau
  async buildTree(
    userId: string,
    orgId: string | undefined,
    projectId: string | undefined,
    documents: any[],
  ): Promise<TreeResponse> {
    try {
      const allFolders = await this.findAllFolders(userId, orgId, projectId);

      const folderMap = new Map<string, FolderTreeResponse>();
      const rootFolders: FolderTreeResponse[] = [];
      const rootDocuments: DocumentSummaryResponse[] = [];

      // Khởi tạo các Node thư mục dạng DTO
      for (const f of allFolders) {
        folderMap.set(f.id, {
          id: f.id,
          name: f.name,
          parentId: f.parentId || undefined,
          isSystem: f.isSystem,
          sortOrder: f.sortOrder,
          description: f.description || undefined,
          documents: [],
          children: [],
        });
      }

      // Xây dựng cây thư mục (móc nối con với cha)
      for (const f of allFolders) {
        const folderNode = folderMap.get(f.id)!;
        if (f.parentId) {
          const parentNode = folderMap.get(f.parentId);
          if (parentNode) {
            parentNode.children.push(folderNode);
          } else {
            // Nếu không tìm thấy cha (mồ côi), cho làm root
            rootFolders.push(folderNode);
          }
        } else {
          // Là folder gốc
          rootFolders.push(folderNode);
        }
      }

      // Phân bổ documents vào các folder tương ứng
      for (const doc of documents) {
        const docSummary = plainToInstance(DocumentSummaryResponse, doc, {
          excludeExtraneousValues: true,
        });

        if (doc.folderId) {
          const folderNode = folderMap.get(doc.folderId as string)!;
          if (folderNode) {
            folderNode.documents.push(docSummary);
          } else {
            // Folder bị xóa nhưng doc chưa xóa, đẩy ra root
            rootDocuments.push(docSummary);
          }
        } else {
          rootDocuments.push(docSummary);
        }
      }

      return plainToInstance(
        TreeResponse,
        {
          folders: rootFolders,
          rootDocuments,
        },
        { excludeExtraneousValues: true },
      );
    } catch (error) {
      console.error('Error building tree:', error);
      throw error;
    }
  }

  // Lấy con trực tiếp của một folder
  async findChildren(
    userId: string,
    folderId: string,
  ): Promise<FolderResponse[]> {
    try {
      const folder = await this.folderRepo.findOne({ where: { id: folderId } });
      if (!folder) throw new ValidationException(ErrorCode.DF001);

      const isProjectFolder = Boolean(folder.projectId);

      const qb = this.folderRepo
        .createQueryBuilder('folder')
        .where('folder.parentId = :folderId', { folderId });

      qb.andWhere(
        this.buildFolderVisibilityClause(':userId', isProjectFolder),
        {
          userId,
        },
      );
      qb.orderBy('folder.sortOrder', 'ASC').addOrderBy('folder.name', 'ASC');

      const children = await qb.getMany();

      return plainToInstance(FolderResponse, children, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      console.error('Error finding children folders:', error);
      throw error;
    }
  }

  async findById(folderId: string): Promise<FolderResponse> {
    try {
      const folder = await this.folderRepo.findOne({ where: { id: folderId } });
      if (!folder) throw new ValidationException(ErrorCode.DF001);

      return plainToInstance(FolderResponse, folder, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      console.error('Error finding folder by id:', error);
      throw error;
    }
  }

  async findByIdForUser(
    folderId: string,
    userId: string,
  ): Promise<FolderResponse> {
    const folder = await this.assertFolderAccess(
      folderId,
      userId,
      ResourcePermission.VIEW,
    );

    return plainToInstance(FolderResponse, folder, {
      excludeExtraneousValues: true,
    });
  }

  async update(
    folderId: string,
    userId: string,
    dto: UpdateFolderRequest,
  ): Promise<FolderResponse> {
    try {
      // Cần EDIT để sửa metadata folder
      const folder = await this.assertFolderAccess(
        folderId,
        userId,
        ResourcePermission.EDIT,
      );

      if (dto.name !== undefined) folder.name = dto.name;
      if (dto.description !== undefined) folder.description = dto.description;
      if (dto.sortOrder !== undefined) folder.sortOrder = dto.sortOrder;

      const saved = await this.folderRepo.save(folder);
      return plainToInstance(FolderResponse, saved, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      console.error('Error updating folder:', error);
      throw error;
    }
  }

  // Di chuyển folder sang parent khác — cập nhật path của folder và toàn bộ subtree
  async move(
    folderId: string,
    userId: string,
    dto: MoveFolderRequest,
  ): Promise<FolderResponse> {
    try {
      // Cần MANAGE để di chuyển folder
      const folder = await this.assertFolderAccess(
        folderId,
        userId,
        ResourcePermission.MANAGE,
      );

      if (dto.parentId) {
        // Không cho phép move vào chính nó hoặc descendant của nó
        const target = await this.folderRepo.findOne({
          where: { id: dto.parentId },
        });
        if (!target) throw new ValidationException(ErrorCode.DF001);

        if (target.path && folder.path && target.path.startsWith(folder.path)) {
          throw new ValidationException(ErrorCode.DF004);
        }
      }

      return await this.dataSource.transaction(async (manager) => {
        const oldPath = folder.path!;
        const newParentPath = dto.parentId
          ? (
              await manager.findOne(DocumentFolder, {
                where: { id: dto.parentId },
              })
            )?.path
          : undefined;

        const newPath = newParentPath
          ? `${newParentPath}.${folderId}`
          : folderId;

        // Cập nhật toàn bộ subtree: thay prefix path cũ bằng path mới
        await manager
          .createQueryBuilder()
          .update(DocumentFolder)
          .set({
            path: () => `replace(path, '${oldPath}', '${newPath}')`,
          })
          .where('path LIKE :prefix', { prefix: `${oldPath}%` })
          .execute();

        folder.parentId =
          dto.parentId !== undefined ? (dto.parentId as any) : folder.parentId;
        folder.path = newPath;
        if (dto.sortOrder !== undefined) {
          folder.sortOrder = dto.sortOrder;
        }
        const saved = await manager.save(folder);

        return plainToInstance(FolderResponse, saved, {
          excludeExtraneousValues: true,
        });
      });
    } catch (error) {
      console.error('Error moving folder:', error);
      throw error;
    }
  }

  async delete(folderId: string, userId: string): Promise<void> {
    try {
      // Cần MANAGE để xoá folder
      const folder = await this.assertFolderAccess(
        folderId,
        userId,
        ResourcePermission.MANAGE,
      );

      // Do not allow manually deleting system folder like Recovery
      if (folder.isSystem) {
        throw new ValidationException(ErrorCode.DF002); // Cannot delete system folder
      }

      const isInsideRecovery = async (folderId: string): Promise<boolean> => {
        let current = await this.folderRepo.findOne({
          where: { id: folderId },
        });
        while (current) {
          if (current.isSystem && current.name === 'Recovery') return true;
          if (!current.parentId) return false;
          current = await this.folderRepo.findOne({
            where: { id: current.parentId },
          });
        }
        return false;
      };

      const alreadyInRecovery = await isInsideRecovery(folderId);

      // If already inside recovery and gets deleted -> it becomes a soft delete forever
      if (alreadyInRecovery) {
        folder.deletedBy = userId;
        await this.folderRepo.save(folder);
        await this.folderRepo.softRemove(folder);
        return;
      }

      // Move to Recovery
      const qb = this.folderRepo
        .createQueryBuilder('folder')
        .where('folder.isSystem = :isSystem', { isSystem: true })
        .andWhere('folder.name = :name', { name: 'Recovery' })
        .andWhere('folder.parentId IS NULL')
        .andWhere(
          folder.organizationId
            ? 'folder.organizationId = :orgId'
            : 'folder.organizationId IS NULL',
          { orgId: folder.organizationId },
        )
        .andWhere(
          folder.projectId
            ? 'folder.projectId = :projectId'
            : 'folder.projectId IS NULL',
          { projectId: folder.projectId },
        );

      const recoveryFolder = await qb.getOne();
      if (!recoveryFolder) {
        // Should realistically exist by subscriber, but just in case
        throw new ValidationException(ErrorCode.DF001);
      }

      // Record where it came from
      folder.originalParentId = folder.parentId;

      // Make the move logic
      await this.dataSource.transaction(async (manager) => {
        const oldPath = folder.path!;
        const newParentPath = recoveryFolder.path;
        const newPath = newParentPath
          ? `${newParentPath}.${folderId}`
          : folderId;

        await manager
          .createQueryBuilder()
          .update(DocumentFolder)
          .set({
            path: () => `replace(path, '${oldPath}', '${newPath}')`,
          })
          .where('path LIKE :prefix', { prefix: `${oldPath}%` })
          .execute();

        folder.parentId = recoveryFolder.id;
        folder.path = newPath;
        folder.deletedBy = userId; // Optional tracking field logic
        await manager.save(DocumentFolder, folder);
      });
    } catch (error) {
      console.error('Error deleting folder:', error);
      throw error;
    }
  }

  async deletePermanent(folderId: string, userId: string): Promise<void> {
    try {
      const folder = await this.assertFolderAccess(
        folderId,
        userId,
        ResourcePermission.MANAGE,
      );

      if (folder.isSystem) {
        throw new ValidationException(ErrorCode.DF002);
      }

      const isInRecovery = await this.isInsideRecovery(folderId);
      if (!isInRecovery) {
        throw new ValidationException(ErrorCode.DF003);
      }

      const folderPath = folder.path ?? folder.id;
      const foldersInSubtree = await this.folderRepo
        .createQueryBuilder('folder')
        .withDeleted()
        .where('folder.path LIKE :prefix', { prefix: `${folderPath}%` })
        .getMany();

      const folderIds = foldersInSubtree.map((f) => f.id);
      if (folderIds.length === 0) return;

      const documents = await this.documentRepo.find({
        where: { folderId: In(folderIds) },
        select: { id: true },
      });
      const documentIds = documents.map((d) => d.id);

      if (documentIds.length > 0) {
        const versions = await this.versionRepo.find({
          where: { documentId: In(documentIds) },
        });

        await Promise.all(
          versions.map((v) =>
            this.imagekitService
              .deleteFileByUrl({ url: v.filePath })
              .catch((err) => {
                console.error(
                  `Failed to delete ImageKit file: ${v.filePath}`,
                  err,
                );
              }),
          ),
        );
      }

      await this.dataSource.transaction(async (manager) => {
        await manager.delete(FolderAccessRule, { folderId: In(folderIds) });

        if (documentIds.length > 0) {
          await manager.delete(DocumentAccessRule, {
            documentId: In(documentIds),
          });
          await manager.delete(DocumentChunk, { documentId: In(documentIds) });
          await manager.delete(DocumentVersion, {
            documentId: In(documentIds),
          });
          await manager.delete(Document, { id: In(documentIds) });
        }

        await manager.delete(DocumentFolder, { id: In(folderIds) });
      });
    } catch (error) {
      console.error('Error deleting folder permanently:', error);
      throw error;
    }
  }

  // Restore folder from Recovery
  async restore(folderId: string, userId: string): Promise<FolderResponse> {
    try {
      // Cần MANAGE để restore folder
      const folder = await this.assertFolderAccess(
        folderId,
        userId,
        ResourcePermission.MANAGE,
      );

      if (folder.isSystem) {
        throw new ValidationException(ErrorCode.DF002);
      }

      if (folder.originalParentId === undefined) {
        throw new ValidationException(ErrorCode.DF003); // Not in recovery maybe
      }

      return await this.dataSource.transaction(async (manager) => {
        // Ensure target originalParentId hasn't been deleted or moved itself out of scope
        // For simplicity, we just put it to the original spot or ROOT if not found
        let targetParentId = folder.originalParentId;
        let targetParentPath: string | undefined;

        if (targetParentId) {
          const parent = await manager.findOne(DocumentFolder, {
            where: { id: targetParentId },
          });
          if (!parent || parent.deletedAt) {
            // Parent no longer valid, dump to ROOT
            targetParentId = undefined;
          } else {
            targetParentPath = parent.path;
          }
        }

        // Check name collision
        let newName = folder.name;
        let duplicateIndex = 1;

        while (true) {
          const duplicateQuery = manager
            .createQueryBuilder(DocumentFolder, 'folder')
            .withDeleted()
            .where('folder.name = :name', { name: newName });
          if (targetParentId) {
            duplicateQuery.andWhere('folder.parentId = :parentId', {
              parentId: targetParentId,
            });
          } else {
            duplicateQuery
              .andWhere('folder.parentId IS NULL')
              .andWhere(
                folder.organizationId
                  ? 'folder.organizationId = :orgId'
                  : 'folder.organizationId IS NULL',
                { orgId: folder.organizationId },
              )
              .andWhere(
                folder.projectId
                  ? 'folder.projectId = :projectId'
                  : 'folder.projectId IS NULL',
                { projectId: folder.projectId },
              );
          }
          const exists = await duplicateQuery.getOne();
          if (!exists || exists.id === folder.id) break;

          // Generate distinct name matching behavior requested +(1), +(2)
          newName = `${folder.name} +(${duplicateIndex})`;
          duplicateIndex++;
        }

        const oldPath = folder.path!;
        const newPath = targetParentPath
          ? `${targetParentPath}.${folderId}`
          : folderId;

        await manager
          .createQueryBuilder()
          .update(DocumentFolder)
          .set({
            path: () => `replace(path, '${oldPath}', '${newPath}')`,
          })
          .where('path LIKE :prefix', { prefix: `${oldPath}%` })
          .execute();

        folder.parentId = targetParentId ? targetParentId : (null as any);
        folder.path = newPath;
        folder.name = newName;
        folder.originalParentId = null as any;
        folder.deletedBy = null as any;

        const saved = await manager.save(DocumentFolder, folder);
        return plainToInstance(FolderResponse, saved, {
          excludeExtraneousValues: true,
        });
      });
    } catch (error) {
      console.error('Error restoring folder:', error);
      throw error;
    }
  }

  /**
   * Bulk-update sortOrder for a list of folders (same level reorder from drag-and-drop).
   */
  async reorder(items: FolderOrderItem[]): Promise<void> {
    try {
      await this.dataSource.transaction(async (manager) => {
        await Promise.all(
          items.map((item) =>
            manager.update(
              DocumentFolder,
              { id: item.id },
              { sortOrder: item.sortOrder },
            ),
          ),
        );
      });
    } catch (error) {
      console.error('Error reordering folders:', error);
      throw error;
    }
  }

  private async isInsideRecovery(folderId: string): Promise<boolean> {
    let current = await this.folderRepo.findOne({
      where: { id: folderId },
      withDeleted: true,
    });

    while (current) {
      if (current.isSystem && current.name === 'Recovery') return true;
      if (!current.parentId) return false;
      current = await this.folderRepo.findOne({
        where: { id: current.parentId },
        withDeleted: true,
      });
    }

    return false;
  }
}
