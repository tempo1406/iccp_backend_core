import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessController } from './access.controller';
import { AccessService } from './access.service';
import { DocumentAccessRule } from '../core/entities/document-access.entity';
import { FolderAccessRule } from '../folder/entities/folder-access.entity';
import { DocumentCoreModule } from '../core/core.module';
import { FolderModule } from '../folder/folder.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentAccessRule, FolderAccessRule]),
    DocumentCoreModule,
    FolderModule,
  ],
  controllers: [AccessController],
  providers: [AccessService],
})
export class AccessModule {}
