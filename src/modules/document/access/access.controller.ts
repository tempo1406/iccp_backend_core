import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiHeader,
} from '@nestjs/swagger';
import { AccessService } from './access.service';
import { CreateAccessRuleRequest } from './dto/request/create-access-rule.request';
import { AccessRuleResponse } from './dto/response/access-rule.response';
import { ApiResponseDto } from '@common/dto/api-response.dto';
import { PermissionGuard } from '@guards/rbac-guard/permission.guard';
import { RequirePermission } from '@decorators/role/require-permission.decorator';
import { PERMISSIONS } from '@modules/rbac/constant/permission.constant';
import { ORGANIZATION_HEADERS } from 'src/decorators/organization/get-org-id.decorator';
import { GetUser } from '@decorators/auth/get-user.decorator';

@ApiTags('Document & Folder Access Management')
@ApiBearerAuth('Authorization')
@ApiHeader({
  name: ORGANIZATION_HEADERS.X_ORGANIZATION_ID,
  description: 'ID tổ chức',
  required: false,
})
@Controller({ path: 'access', version: '1' })
export class AccessController {
  constructor(private readonly accessService: AccessService) {}

  // --- Document Access ---

  @Post('documents/:documentId')
  @UseGuards(PermissionGuard)
  @RequirePermission(PERMISSIONS.DOCUMENTS.DOCUMENTS.MANAGE_ACCESS)
  @ApiOperation({
    summary: 'Cấp quyền truy cập một tài liệu cho danh sách User/Role/Project',
  })
  async grantDocumentAccess(
    @GetUser('sub') userId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body() dto: CreateAccessRuleRequest,
  ): Promise<ApiResponseDto<AccessRuleResponse[]>> {
    const data = await this.accessService.grantDocumentAccess(
      userId,
      documentId,
      dto,
    );
    return new ApiResponseDto(
      201,
      'Granted document access successfully',
      data,
    );
  }

  @Get('documents/:documentId')
  @UseGuards(PermissionGuard)
  @RequirePermission(PERMISSIONS.DOCUMENTS.DOCUMENTS.VIEW_ACCESS)
  @ApiOperation({
    summary: 'Lấy danh sách các quyền truy cập được cấp trực tiếp của tài liệu',
  })
  async getDocumentAccess(
    @GetUser('sub') userId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ): Promise<ApiResponseDto<AccessRuleResponse[]>> {
    const data = await this.accessService.getDocumentAccess(userId, documentId);
    return new ApiResponseDto(
      200,
      'Fetched document access successfully',
      data,
    );
  }

  @Delete('documents/:documentId/:accessType/:accessId')
  @UseGuards(PermissionGuard)
  @RequirePermission(PERMISSIONS.DOCUMENTS.DOCUMENTS.MANAGE_ACCESS)
  @ApiOperation({
    summary:
      'Thu hồi quyền truy cập tài liệu (nếu truyền ?permission= thì xoá rule cụ thể; không truyền → xoá tất cả rule của subject)',
  })
  @ApiQuery({
    name: 'permission',
    required: false,
    enum: ['view', 'download', 'upload', 'edit', 'manage'],
  })
  async revokeDocumentAccess(
    @GetUser('sub') userId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Param('accessType') accessType: string,
    @Param('accessId', ParseUUIDPipe) accessId: string,
    @Query('permission') permission?: string,
  ): Promise<ApiResponseDto<void>> {
    await this.accessService.revokeDocumentAccess(
      userId,
      documentId,
      accessType,
      accessId,
      permission,
    );
    return new ApiResponseDto(200, 'Revoked document access successfully');
  }

  // --- Folder Access ---

  @Post('folders/:folderId')
  @UseGuards(PermissionGuard)
  // Assuming folder uses same generic manage access or specific one
  @RequirePermission(PERMISSIONS.DOCUMENTS.DOCUMENTS.MANAGE_ACCESS)
  @ApiOperation({
    summary: 'Cấp quyền truy cập một thư mục cho danh sách User/Role/Project',
  })
  async grantFolderAccess(
    @GetUser('sub') userId: string,
    @Param('folderId', ParseUUIDPipe) folderId: string,
    @Body() dto: CreateAccessRuleRequest,
  ): Promise<ApiResponseDto<AccessRuleResponse[]>> {
    const data = await this.accessService.grantFolderAccess(
      userId,
      folderId,
      dto,
    );
    return new ApiResponseDto(201, 'Granted folder access successfully', data);
  }

  @Get('folders/:folderId')
  @UseGuards(PermissionGuard)
  @RequirePermission(PERMISSIONS.DOCUMENTS.DOCUMENTS.VIEW_ACCESS)
  @ApiOperation({
    summary: 'Lấy danh sách các quyền truy cập được cấp trực tiếp của thư mục',
  })
  async getFolderAccess(
    @GetUser('sub') userId: string,
    @Param('folderId', ParseUUIDPipe) folderId: string,
  ): Promise<ApiResponseDto<AccessRuleResponse[]>> {
    const data = await this.accessService.getFolderAccess(userId, folderId);
    return new ApiResponseDto(200, 'Fetched folder access successfully', data);
  }

  @Delete('folders/:folderId/:accessType/:accessId')
  @UseGuards(PermissionGuard)
  @RequirePermission(PERMISSIONS.DOCUMENTS.DOCUMENTS.MANAGE_ACCESS)
  @ApiOperation({
    summary:
      'Thu hồi quyền truy cập thư mục (nếu truyền ?permission= thì xoá rule cụ thể; không truyền → xoá tất cả rule của subject)',
  })
  @ApiQuery({
    name: 'permission',
    required: false,
    enum: ['view', 'download', 'upload', 'edit', 'manage'],
  })
  async revokeFolderAccess(
    @GetUser('sub') userId: string,
    @Param('folderId', ParseUUIDPipe) folderId: string,
    @Param('accessType') accessType: string,
    @Param('accessId', ParseUUIDPipe) accessId: string,
    @Query('permission') permission?: string,
  ): Promise<ApiResponseDto<void>> {
    await this.accessService.revokeFolderAccess(
      userId,
      folderId,
      accessType,
      accessId,
      permission,
    );
    return new ApiResponseDto(200, 'Revoked folder access successfully');
  }
}
