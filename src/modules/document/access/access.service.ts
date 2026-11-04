import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';

import {
  DocumentAccessRule,
  ResourcePermission,
} from '../core/entities/document-access.entity';
import { FolderAccessRule } from '../folder/entities/folder-access.entity';
import { CreateAccessRuleRequest } from './dto/request/create-access-rule.request';
import { AccessRuleResponse } from './dto/response/access-rule.response';
import { DocumentCoreService } from '../core/core.service';
import { FolderService } from '../folder/folder.service';

@Injectable()
export class AccessService {
  constructor(
    @InjectRepository(DocumentAccessRule)
    private readonly docAccessRepo: Repository<DocumentAccessRule>,
    @InjectRepository(FolderAccessRule)
    private readonly folderAccessRepo: Repository<FolderAccessRule>,
    private readonly documentCoreService: DocumentCoreService,
    private readonly folderService: FolderService,
  ) {}

  // ── Document Access ────────────────────────────────────────────────────────

  async grantDocumentAccess(
    userId: string,
    documentId: string,
    dto: CreateAccessRuleRequest,
  ): Promise<AccessRuleResponse[]> {
    await this.documentCoreService.ensureDocumentAccess(
      documentId,
      userId,
      ResourcePermission.MANAGE,
    );

    const results: DocumentAccessRule[] = [];
    const toCreate: DocumentAccessRule[] = [];

    for (const rule of dto.rules) {
      const permission = rule.permission ?? ResourcePermission.VIEW;

      // Idempotent: (documentId, accessType, accessId, permission) là unique key
      const exists = await this.docAccessRepo.findOne({
        where: {
          documentId,
          accessType: rule.accessType,
          accessId: rule.accessId,
          permission,
        },
      });

      if (exists) {
        results.push(exists);
      } else {
        toCreate.push(
          this.docAccessRepo.create({
            documentId,
            accessType: rule.accessType,
            accessId: rule.accessId,
            permission,
          }),
        );
      }
    }

    if (toCreate.length > 0) {
      const saved = await this.docAccessRepo.save(toCreate);
      results.push(...saved);
    }

    return plainToInstance(AccessRuleResponse, results, {
      excludeExtraneousValues: true,
    });
  }

  async getDocumentAccess(
    userId: string,
    documentId: string,
  ): Promise<AccessRuleResponse[]> {
    await this.documentCoreService.ensureDocumentAccess(
      documentId,
      userId,
      ResourcePermission.VIEW,
    );

    const rules = await this.docAccessRepo.find({ where: { documentId } });
    return plainToInstance(AccessRuleResponse, rules, {
      excludeExtraneousValues: true,
    });
  }

  async revokeDocumentAccess(
    userId: string,
    documentId: string,
    accessType: string,
    accessId: string,
    permission?: string,
  ): Promise<void> {
    await this.documentCoreService.ensureDocumentAccess(
      documentId,
      userId,
      ResourcePermission.MANAGE,
    );

    // Nếu truyền permission thì xoá rule cụ thể; không truyền → xoá tất cả rule của subject này
    if (permission) {
      const rule = await this.docAccessRepo.findOne({
        where: { documentId, accessType, accessId, permission },
      });
      if (rule) await this.docAccessRepo.remove(rule);
    } else {
      const rules = await this.docAccessRepo.find({
        where: { documentId, accessType, accessId },
      });
      if (rules.length) await this.docAccessRepo.remove(rules);
    }
  }

  // ── Folder Access ──────────────────────────────────────────────────────────

  async grantFolderAccess(
    userId: string,
    folderId: string,
    dto: CreateAccessRuleRequest,
  ): Promise<AccessRuleResponse[]> {
    await this.folderService.assertFolderAccess(
      folderId,
      userId,
      ResourcePermission.MANAGE,
    );

    const results: FolderAccessRule[] = [];
    const toCreate: FolderAccessRule[] = [];

    for (const rule of dto.rules) {
      const permission = rule.permission ?? ResourcePermission.VIEW;

      const exists = await this.folderAccessRepo.findOne({
        where: {
          folderId,
          accessType: rule.accessType,
          accessId: rule.accessId,
          permission,
        },
      });

      if (exists) {
        results.push(exists);
      } else {
        toCreate.push(
          this.folderAccessRepo.create({
            folderId,
            accessType: rule.accessType,
            accessId: rule.accessId,
            permission,
          }),
        );
      }
    }

    if (toCreate.length > 0) {
      const saved = await this.folderAccessRepo.save(toCreate);
      results.push(...saved);
    }

    return plainToInstance(AccessRuleResponse, results, {
      excludeExtraneousValues: true,
    });
  }

  async getFolderAccess(
    userId: string,
    folderId: string,
  ): Promise<AccessRuleResponse[]> {
    await this.folderService.assertFolderAccess(
      folderId,
      userId,
      ResourcePermission.VIEW,
    );

    const rules = await this.folderAccessRepo.find({ where: { folderId } });
    return plainToInstance(AccessRuleResponse, rules, {
      excludeExtraneousValues: true,
    });
  }

  async revokeFolderAccess(
    userId: string,
    folderId: string,
    accessType: string,
    accessId: string,
    permission?: string,
  ): Promise<void> {
    await this.folderService.assertFolderAccess(
      folderId,
      userId,
      ResourcePermission.MANAGE,
    );

    if (permission) {
      const rule = await this.folderAccessRepo.findOne({
        where: { folderId, accessType, accessId, permission },
      });
      if (rule) await this.folderAccessRepo.remove(rule);
    } else {
      const rules = await this.folderAccessRepo.find({
        where: { folderId, accessType, accessId },
      });
      if (rules.length) await this.folderAccessRepo.remove(rules);
    }
  }
}
