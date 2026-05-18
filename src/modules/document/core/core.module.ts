import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentCoreService } from './core.service';
import { DocumentCoreController } from './core.controller';
import { Document } from './entities/document.entity';
import { DocumentVersion } from './entities/document-version.entity';
import { DocumentChunk } from './entities/document-chunk.entity';
import { DocumentAccessRule } from './entities/document-access.entity';
import { FolderModule } from '../folder/folder.module';
import { AiInternalModule } from '@modules/ai-internal/ai-internal.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Document,
      DocumentVersion,
      DocumentChunk,
      DocumentAccessRule,
    ]),
    FolderModule,
    AiInternalModule,
  ],
  controllers: [DocumentCoreController],
  providers: [DocumentCoreService],
  exports: [DocumentCoreService],
})
export class DocumentCoreModule {}
