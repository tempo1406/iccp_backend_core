import { Module } from '@nestjs/common';
import { AiInternalCoreModule } from './core/core.module';
import { AiInternalDocumentModule } from './document/document.module';

@Module({
  imports: [AiInternalCoreModule, AiInternalDocumentModule],
  exports: [AiInternalCoreModule, AiInternalDocumentModule],
})
export class AiInternalModule {}
