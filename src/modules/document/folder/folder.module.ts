import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FolderService } from './folder.service';
import { FolderController } from './folder.controller';
import { DocumentFolder } from './entities/document-folder.entity';
import { FolderAccessRule } from './entities/folder-access.entity';
import { DocumentFolderSubscriber } from './subscribers/document-folder.subscriber';
import { Document } from '../core/entities/document.entity';
import { DocumentVersion } from '../core/entities/document-version.entity';
import { DocumentChunk } from '../core/entities/document-chunk.entity';
import { DocumentAccessRule } from '../core/entities/document-access.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DocumentFolder,
      FolderAccessRule,
      Document,
      DocumentVersion,
      DocumentChunk,
      DocumentAccessRule,
    ]),
  ],
  controllers: [FolderController],
  providers: [FolderService, DocumentFolderSubscriber],
  exports: [FolderService],
})
export class FolderModule {}
