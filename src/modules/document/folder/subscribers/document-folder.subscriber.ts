import {
  EventSubscriber,
  EntitySubscriberInterface,
  InsertEvent,
} from 'typeorm';
import { DocumentFolder } from '../entities/document-folder.entity';

@EventSubscriber()
export class DocumentFolderSubscriber implements EntitySubscriberInterface<DocumentFolder> {
  listenTo() {
    return DocumentFolder;
  }

  async afterInsert(event: InsertEvent<DocumentFolder>) {
    const { entity, manager } = event;

    // Only care if it is a ROOT folder (parentId is null/undefined)
    // And it is NOT a system folder itself (to avoid infinite loop of Recovery creating another Recovery)
    if (entity.parentId || entity.isSystem) {
      return;
    }

    // Determine the scope of this root folder
    const orgId = entity.organizationId ?? null;
    const projectId = entity.projectId ?? null;

    // Use an isolated query runner or just the manager to find existing Recovery folder for this exact scope
    const qb = manager
      .createQueryBuilder(DocumentFolder, 'folder')
      .where('folder.isSystem = :isSystem', { isSystem: true })
      .andWhere('folder.name = :name', { name: 'Recovery' })
      .andWhere('folder.parentId IS NULL');

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

    const existingRecovery = await qb.getOne();

    // If no Recovery folder exists for this scope, create one
    if (!existingRecovery) {
      const recoveryFolder = manager.create(DocumentFolder, {
        organizationId: entity.organizationId,
        projectId: entity.projectId,
        name: 'Recovery',
        description: 'System folder for deleted items',
        isSystem: true,
        sortOrder: 9999, // Push to bottom
        createdBy: entity.createdBy,
      });

      const savedRecovery = await manager.save(DocumentFolder, recoveryFolder);
      // Give it a path matching its ID since it's a root folder
      savedRecovery.path = savedRecovery.id;
      await manager.save(DocumentFolder, savedRecovery);
    }
  }
}
