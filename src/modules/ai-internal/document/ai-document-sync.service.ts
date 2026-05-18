import { Injectable, Logger } from '@nestjs/common';
import { AiInternalCoreHttpService } from '../core/services/ai-internal-core-http.service';

@Injectable()
export class AiDocumentSyncService {
  private readonly logger = new Logger(AiDocumentSyncService.name);

  constructor(private readonly aiHttp: AiInternalCoreHttpService) {}

  async deleteDocumentVectors(
    documentId: string,
    organizationId: string,
  ): Promise<void> {
    const ok = await this.aiHttp.delete(
      `/api/v1/ingest/documents/${documentId}`,
      {
        organization_id: organizationId,
      },
    );

    if (ok) {
      this.logger.log(`Vectors deleted for document ${documentId}`);
      return;
    }

    this.logger.warn(
      `Failed to delete vectors for ${documentId}. ` +
        'Vectors may remain stale and will be blocked by batch-access-check.',
    );
  }

  async syncDocumentMetadata(
    documentId: string,
    updates: { accessScope?: string; folderId?: string },
  ): Promise<void> {
    if (!updates.accessScope && !updates.folderId) return;

    const ok = await this.aiHttp.patch(
      `/api/v1/internal/documents/${documentId}/metadata`,
      updates,
    );

    if (ok) {
      this.logger.log(`Metadata synced for document ${documentId}`);
      return;
    }

    this.logger.warn(
      `Failed to sync metadata for ${documentId}. ` +
        'batch-access-check remains the ACL source of truth.',
    );
  }
}
