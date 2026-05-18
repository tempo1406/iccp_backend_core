import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AiInternalCoreHttpService } from './services/ai-internal-core-http.service';
import { AiInternalKeyGuard } from './guards/ai-internal-key.guard';

@Module({
  imports: [HttpModule],
  providers: [AiInternalCoreHttpService, AiInternalKeyGuard],
  exports: [AiInternalCoreHttpService, AiInternalKeyGuard],
})
export class AiInternalCoreModule {}
