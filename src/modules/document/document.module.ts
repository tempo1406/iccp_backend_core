import { Module } from '@nestjs/common';
import { DocumentCoreModule } from './core/core.module';
import { CategoryModule } from './category/category.module';
import { FolderModule } from './folder/folder.module';
import { AccessModule } from './access/access.module';

@Module({
  imports: [FolderModule, CategoryModule, DocumentCoreModule, AccessModule],
})
export class DocumentModule {}
