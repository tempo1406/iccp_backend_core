import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiHeader,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { DocumentCoreService } from './core.service';
import { UploadDocumentRequest } from './dto/request/upload-document.request';
import { UpdateDocumentRequest } from './dto/request/update-document.request';
import { UploadVersionRequest } from './dto/request/upload-version.request';
import { DocumentResponse } from './dto/response/document.response';
import { DocumentVersionResponse } from './dto/response/document-version.response';
import { DocumentChunkResponse } from './dto/response/document-chunk.response';
import { TreeResponse } from '../folder/dto/response/tree.response';
import { ApiResponseDto } from '@common/dto/api-response.dto';
import { GetUser } from '@decorators/auth/get-user.decorator';
import {
  GetOrgId,
  ORGANIZATION_HEADERS,
} from 'src/decorators/organization/get-org-id.decorator';
import { PermissionGuard } from '@guards/rbac-guard/permission.guard';
import { RequirePermission } from '@decorators/role/require-permission.decorator';
import { PERMISSIONS } from '@modules/rbac/constant/permission.constant';

// 100 MB
const MAX_FILE_SIZE = 100 * 1024 * 1024;

// Allowed MIME types (matches be_ai ALLOWED_FILE_TYPES)
const ALLOWED_MIME_TYPES =
  /^(application\/(pdf|msword|vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet)|vnd\.ms-excel)|text\/(plain|markdown))$/;

const FILE_TYPE_VALIDATOR_OPTIONS = {
  fileType: ALLOWED_MIME_TYPES,
  // DOCX/XLSX are zip containers; magic-number validation can classify them as zip.
  // Keep explicit mimetype validation to match FE + be_ai contract.
  skipMagicNumbersValidation: true,
} as const;

@ApiTags('Documents')
@ApiBearerAuth('Authorization')
@ApiHeader({
  name: ORGANIZATION_HEADERS.X_ORGANIZATION_ID,
  description: 'ID tổ chức (bỏ trống nếu là system admin)',
  required: false,
})
@Controller({ path: 'documents', version: '1' })
export class DocumentCoreController {
  constructor(private readonly documentCoreService: DocumentCoreService) {}

  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermission(PERMISSIONS.DOCUMENTS.DOCUMENTS.UPLOAD_FILE)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload tài liệu mới' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'title'],
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string' },
        description: { type: 'string' },
        folderId: { type: 'string', format: 'uuid' },
        categoryId: { type: 'string', format: 'uuid' },
        accessScope: {
          type: 'string',
          enum: [
            'private',
            'organization',
            'project',
            'role',
            'user',
            'system',
          ],
          default: 'organization',
        },
      },
    },
  })
  async upload(
    @GetUser('sub') userId: string,
    @GetOrgId() orgId: string | undefined,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE }),
          new FileTypeValidator(FILE_TYPE_VALIDATOR_OPTIONS),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() dto: UploadDocumentRequest,
  ): Promise<ApiResponseDto<DocumentResponse>> {
    const data = await this.documentCoreService.upload(
      userId,
      orgId,
      file,
      dto,
    );
    return new ApiResponseDto(201, 'Document uploaded successfully', data);
  }

  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermission(PERMISSIONS.DOCUMENTS.DOCUMENTS.LIST)
  @ApiOperation({
    summary:
      'Lấy danh sách tài liệu (có thể filter theo folder/category/project)',
  })
  @ApiQuery({ name: 'folderId', required: false, type: String })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'projectId', required: false, type: String })
  async findAll(
    @GetUser('sub') userId: string,
    @GetOrgId() orgId: string | undefined,
    @Query('folderId') folderId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('projectId') projectId?: string,
  ): Promise<ApiResponseDto<DocumentResponse[]>> {
    const data = await this.documentCoreService.findAll(
      userId,
      orgId,
      folderId,
      categoryId,
      projectId,
    );
    return new ApiResponseDto(200, 'Fetched documents successfully', data);
  }

  @Get('tree')
  @UseGuards(PermissionGuard)
  @RequirePermission(PERMISSIONS.DOCUMENTS.DOCUMENTS.LIST)
  @ApiOperation({
    summary: 'Lấy toàn bộ cây thư mục và tài liệu lồng nhau',
  })
  @ApiQuery({ name: 'projectId', required: false, type: String })
  async getTree(
    @GetUser('sub') userId: string,
    @GetOrgId() orgId: string | undefined,
    @Query('projectId') projectId?: string,
  ): Promise<ApiResponseDto<TreeResponse>> {
    const data = await this.documentCoreService.getTree(
      userId,
      orgId,
      projectId,
    );
    return new ApiResponseDto(200, 'Fetched tree successfully', data);
  }

  @Get('recovery')
  @UseGuards(PermissionGuard)
  @RequirePermission(PERMISSIONS.DOCUMENTS.DOCUMENTS.LIST)
  @ApiOperation({
    summary: 'Lấy danh sách tài liệu trong thùng rác (đã xoá)',
  })
  async findRecovery(
    @GetUser('sub') userId: string,
    @GetOrgId() orgId: string | undefined,
  ): Promise<ApiResponseDto<DocumentResponse[]>> {
    const data = await this.documentCoreService.findRecovery(userId, orgId);
    return new ApiResponseDto(
      200,
      'Fetched recovery documents successfully',
      data,
    );
  }

  @Get(':id')
  @UseGuards(PermissionGuard)
  @RequirePermission(PERMISSIONS.DOCUMENTS.DOCUMENTS.VIEW)
  @ApiOperation({ summary: 'Lấy thông tin một tài liệu' })
  async findById(
    @GetUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) documentId: string,
  ): Promise<ApiResponseDto<DocumentResponse>> {
    const data = await this.documentCoreService.findById(documentId, userId);
    return new ApiResponseDto(200, 'Fetched document successfully', data);
  }

  @Patch(':id')
  @UseGuards(PermissionGuard)
  @RequirePermission(PERMISSIONS.DOCUMENTS.DOCUMENTS.UPDATE)
  @ApiOperation({
    summary:
      'Cập nhật metadata tài liệu (tiêu đề, folder, category, access scope...)',
  })
  async update(
    @GetUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) documentId: string,
    @Body() dto: UpdateDocumentRequest,
  ): Promise<ApiResponseDto<DocumentResponse>> {
    const data = await this.documentCoreService.update(documentId, userId, dto);
    return new ApiResponseDto(200, 'Document updated successfully', data);
  }

  @Delete(':id')
  @UseGuards(PermissionGuard)
  @RequirePermission(PERMISSIONS.DOCUMENTS.DOCUMENTS.DELETE)
  @ApiOperation({ summary: 'Vô hiệu hoá tài liệu (soft delete)' })
  async deactivate(
    @GetUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) documentId: string,
  ): Promise<ApiResponseDto<void>> {
    await this.documentCoreService.deactivate(documentId, userId);
    return new ApiResponseDto(200, 'Document deactivated successfully');
  }

  @Post(':id/restore')
  @UseGuards(PermissionGuard)
  @RequirePermission(PERMISSIONS.DOCUMENTS.DOCUMENTS.UPDATE)
  @ApiOperation({ summary: 'Khôi phục tài liệu từ thùng rác' })
  async restore(
    @GetUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) documentId: string,
  ): Promise<ApiResponseDto<DocumentResponse>> {
    const data = await this.documentCoreService.restore(documentId, userId);
    return new ApiResponseDto(200, 'Document restored successfully', data);
  }

  @Delete(':id/permanent')
  @UseGuards(PermissionGuard)
  @RequirePermission(PERMISSIONS.DOCUMENTS.DOCUMENTS.DELETE)
  @ApiOperation({ summary: 'Xoá vĩnh viễn tài liệu' })
  async deletePermanent(
    @GetUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) documentId: string,
  ): Promise<ApiResponseDto<void>> {
    await this.documentCoreService.deletePermanent(documentId, userId);
    return new ApiResponseDto(200, 'Document permanently deleted successfully');
  }

  @Post(':id/versions')
  @UseGuards(PermissionGuard)
  @RequirePermission(PERMISSIONS.DOCUMENTS.DOCUMENTS.CREATE_VERSION)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload version mới cho tài liệu (explicit versioning)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        changeNotes: { type: 'string' },
      },
    },
  })
  async uploadNewVersion(
    @Param('id', ParseUUIDPipe) documentId: string,
    @GetUser('sub') userId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE }),
          new FileTypeValidator(FILE_TYPE_VALIDATOR_OPTIONS),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() dto: UploadVersionRequest,
  ): Promise<ApiResponseDto<DocumentVersionResponse>> {
    const data = await this.documentCoreService.uploadNewVersion(
      documentId,
      userId,
      file,
      dto,
    );
    return new ApiResponseDto(201, 'New version uploaded successfully', data);
  }

  @Get(':id/versions')
  @UseGuards(PermissionGuard)
  @RequirePermission(PERMISSIONS.DOCUMENTS.DOCUMENTS.LIST_VERSIONS)
  @ApiOperation({ summary: 'Lấy lịch sử version của tài liệu' })
  async findVersions(
    @GetUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) documentId: string,
  ): Promise<ApiResponseDto<DocumentVersionResponse[]>> {
    const data = await this.documentCoreService.findVersions(
      documentId,
      userId,
    );
    return new ApiResponseDto(200, 'Fetched versions successfully', data);
  }

  @Get(':id/chunks')
  @UseGuards(PermissionGuard)
  @RequirePermission(PERMISSIONS.DOCUMENTS.DOCUMENTS.VIEW)
  @ApiOperation({ summary: 'Lấy danh sách chunks đã được index của tài liệu' })
  async getChunks(
    @GetUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) documentId: string,
  ): Promise<ApiResponseDto<DocumentChunkResponse[]>> {
    const data = await this.documentCoreService.getChunks(documentId, userId);
    return new ApiResponseDto(200, 'Fetched chunks successfully', data);
  }
}
