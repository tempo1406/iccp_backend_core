import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { ApiResponseDto } from '@common/dto/api-response.dto';
import { AiInternalKeyGuard } from '../core/guards/ai-internal-key.guard';
import { BatchAccessCheckRequest } from './dto/request/batch-access-check.request';
import { AiInternalDocumentService } from './internal.service';
import { UpdateDocumentStatusRequest } from './dto/request/update-status.request';
import { SyncDocumentMetadataRequest } from './dto/request/sync-metadata.request';
import { AiInternalDocumentInfoResponse } from '@modules/ai-internal/document/dto/response/document-info.response';
import { AiInternalBatchAccessCheckResponse } from '@modules/ai-internal/document/dto/response/batch-access-check.response';
import { AiInternalUpdateStatusResponse } from '@modules/ai-internal/document/dto/response/update-status.response';
import { AiInternalSyncMetadataResponse } from '@modules/ai-internal/document/dto/response/sync-metadata.response';

@ApiTags('AI Internal / Documents')
@ApiBearerAuth('Authorization')
@ApiSecurity('X-Internal-Key')
@ApiHeader({
  name: 'x-internal-key',
  description: 'Service-to-service key configured by INTERNAL_API_KEY',
  required: true,
})
@UseGuards(AiInternalKeyGuard)
@Controller({ path: 'internal/documents', version: '1' })
export class AiInternalDocumentController {
  constructor(private readonly internalService: AiInternalDocumentService) {}

  @Get(':id')
  @ApiOperation({ summary: '[INTERNAL] Get document info for ai service' })
  async getDocumentInfo(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<AiInternalDocumentInfoResponse>> {
    const data = await this.internalService.getDocumentInfo(id);
    return new ApiResponseDto(200, 'Document info fetched successfully', data);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: '[INTERNAL] Update indexing status from ai service',
  })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDocumentStatusRequest,
  ): Promise<ApiResponseDto<AiInternalUpdateStatusResponse>> {
    const data = await this.internalService.updateStatus(
      id,
      dto.status,
      dto.errorMessage,
      dto.indexedChunks,
    );
    return new ApiResponseDto(
      200,
      'Document status updated successfully',
      data,
    );
  }

  @Post('batch-access-check')
  @ApiOperation({
    summary: '[INTERNAL] Batch ACL check for ai runtime retrieval',
  })
  async batchAccessCheck(
    @Body() dto: BatchAccessCheckRequest,
  ): Promise<ApiResponseDto<AiInternalBatchAccessCheckResponse>> {
    const data = await this.internalService.batchAccessCheck(dto);
    return new ApiResponseDto(200, 'Batch access check completed', data);
  }

  @Patch(':id/metadata')
  @ApiOperation({
    summary: '[INTERNAL] Sync document metadata to core database',
  })
  async syncMetadata(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SyncDocumentMetadataRequest,
  ): Promise<ApiResponseDto<AiInternalSyncMetadataResponse>> {
    const data = await this.internalService.syncMetadata(
      id,
      dto.accessScope,
      dto.folderId,
    );
    return new ApiResponseDto(
      200,
      'Document metadata synced successfully',
      data,
    );
  }
}
