import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from '@modules/document/core/entities/document.entity';
import { DocumentFolder } from '@modules/document/folder/entities/document-folder.entity';
import { AiInternalCoreModule } from '../core/core.module';
import { AiInternalDocumentController } from './internal.controller';
import { AiInternalDocumentService } from './internal.service';
import { AiDocumentSyncService } from './ai-document-sync.service';
@Module({
  imports: [
    TypeOrmModule.forFeature([Document, DocumentFolder]),
    AiInternalCoreModule,
  ],
  controllers: [AiInternalDocumentController],
  providers: [AiInternalDocumentService, AiDocumentSyncService],
  exports: [AiDocumentSyncService],
})
export class AiInternalDocumentModule {}
