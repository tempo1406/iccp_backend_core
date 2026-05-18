import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { FolderService } from './folder.service';
import { CreateFolderRequest } from './dto/request/create-folder.request';
import { UpdateFolderRequest } from './dto/request/update-folder.request';
import { MoveFolderRequest } from './dto/request/move-folder.request';
import { ReorderFoldersRequest } from './dto/request/reorder-folders.request';
import { FolderResponse } from './dto/response/folder.response';
import { ApiResponseDto } from '@common/dto/api-response.dto';
import { GetUser } from '@decorators/auth/get-user.decorator';
import {
  GetOrgId,
  ORGANIZATION_HEADERS,
} from 'src/decorators/organization/get-org-id.decorator';
import { PermissionGuard } from '@guards/rbac-guard/permission.guard';
import { RequirePermission } from '@decorators/role/require-permission.decorator';
import { PERMISSIONS } from '@modules/rbac/constant/permission.constant';

@ApiTags('Document Folders')
@ApiBearerAuth('Authorization')
@ApiHeader({
  name: ORGANIZATION_HEADERS.X_ORGANIZATION_ID,
  description: 'ID tổ chức (bỏ trống nếu là system admin)',
  required: false,
})
@Controller({ path: 'documents/folders', version: '1' })
export class FolderController {
  constructor(private readonly folderService: FolderService) {}

  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermission(PERMISSIONS.DOCUMENTS.FOLDERS.CREATE)
  @ApiOperation({ summary: 'Tạo folder mới' })
  async create(
    @GetUser('sub') userId: string,
    @GetOrgId() orgId: string | undefined,
    @Body() dto: CreateFolderRequest,
  ): Promise<ApiResponseDto<FolderResponse>> {
    const data = await this.folderService.create(userId, orgId, dto);
    return new ApiResponseDto(201, 'Folder created successfully', data);
  }

  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermission(PERMISSIONS.DOCUMENTS.FOLDERS.LIST)
  @ApiOperation({ summary: 'Lấy danh sách root folders của org' })
  async findRoots(
    @GetUser('sub') userId: string,
    @GetOrgId() orgId: string | undefined,
  ): Promise<ApiResponseDto<FolderResponse[]>> {
    const data = await this.folderService.findRoots(userId, orgId);
    return new ApiResponseDto(200, 'Fetched folders successfully', data);
  }

  @Get(':id')
  @UseGuards(PermissionGuard)
  @RequirePermission(PERMISSIONS.DOCUMENTS.FOLDERS.VIEW)
  @ApiOperation({ summary: 'Lấy thông tin một folder' })
  async findById(
    @GetUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) folderId: string,
  ): Promise<ApiResponseDto<FolderResponse>> {
    const data = await this.folderService.findByIdForUser(folderId, userId);
    return new ApiResponseDto(200, 'Fetched folder successfully', data);
  }

  @Get(':id/children')
  @UseGuards(PermissionGuard)
  @RequirePermission(PERMISSIONS.DOCUMENTS.FOLDERS.LIST)
  @ApiOperation({ summary: 'Lấy danh sách folder con trực tiếp' })
  async findChildren(
    @GetUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) folderId: string,
  ): Promise<ApiResponseDto<FolderResponse[]>> {
    const data = await this.folderService.findChildren(userId, folderId);
    return new ApiResponseDto(200, 'Fetched children successfully', data);
  }

  @Patch('reorder')
  @UseGuards(PermissionGuard)
  @RequirePermission(PERMISSIONS.DOCUMENTS.FOLDERS.UPDATE)
  @ApiOperation({
    summary: 'Cập nhật thứ tự nhiều folder cùng cấp (bulk reorder)',
  })
  async reorder(
    @Body() dto: ReorderFoldersRequest,
  ): Promise<ApiResponseDto<void>> {
    await this.folderService.reorder(dto.items);
    return new ApiResponseDto(200, 'Folders reordered successfully');
  }

  @Patch(':id')
  @UseGuards(PermissionGuard)
  @RequirePermission(PERMISSIONS.DOCUMENTS.FOLDERS.UPDATE)
  @ApiOperation({
    summary: 'Cập nhật thông tin folder (cần quyền EDIT trên folder)',
  })
  async update(
    @GetUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) folderId: string,
    @Body() dto: UpdateFolderRequest,
  ): Promise<ApiResponseDto<FolderResponse>> {
    const data = await this.folderService.update(folderId, userId, dto);
    return new ApiResponseDto(200, 'Folder updated successfully', data);
  }

  @Patch(':id/move')
  @UseGuards(PermissionGuard)
  @RequirePermission(PERMISSIONS.DOCUMENTS.FOLDERS.MOVE)
  @ApiOperation({
    summary:
      'Di chuyển folder sang vị trí khác trong cây (cần quyền MANAGE trên folder)',
  })
  async move(
    @GetUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) folderId: string,
    @Body() dto: MoveFolderRequest,
  ): Promise<ApiResponseDto<FolderResponse>> {
    const data = await this.folderService.move(folderId, userId, dto);
    return new ApiResponseDto(200, 'Folder moved successfully', data);
  }

  @Post(':id/restore')
  @UseGuards(PermissionGuard)
  @RequirePermission(PERMISSIONS.DOCUMENTS.FOLDERS.UPDATE)
  @ApiOperation({
    summary:
      'Khôi phục folder từ thùng rác về vị trí cũ (cần quyền MANAGE trên folder)',
  })
  async restore(
    @GetUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) folderId: string,
  ): Promise<ApiResponseDto<FolderResponse>> {
    const data = await this.folderService.restore(folderId, userId);
    return new ApiResponseDto(200, 'Folder restored successfully', data);
  }

  @Delete(':id')
  @UseGuards(PermissionGuard)
  @RequirePermission(PERMISSIONS.DOCUMENTS.FOLDERS.DELETE)
  @ApiOperation({ summary: 'Xoá folder (chuyển vào Recovery hoặc xoá mềm)' })
  async delete(
    @GetUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) folderId: string,
  ): Promise<ApiResponseDto<void>> {
    await this.folderService.delete(folderId, userId);
    return new ApiResponseDto(200, 'Folder deleted successfully');
  }

  @Delete(':id/permanent')
  @UseGuards(PermissionGuard)
  @RequirePermission(PERMISSIONS.DOCUMENTS.FOLDERS.DELETE)
  @ApiOperation({
    summary: 'Xoá vĩnh viễn folder trong Recovery (kèm subtree và documents)',
  })
  async deletePermanent(
    @GetUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) folderId: string,
  ): Promise<ApiResponseDto<void>> {
    await this.folderService.deletePermanent(folderId, userId);
    return new ApiResponseDto(200, 'Folder permanently deleted successfully');
  }
}
