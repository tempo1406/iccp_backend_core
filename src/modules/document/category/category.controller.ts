import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  Put,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CategoryService } from './category.service';
import { CreateCategoryRequest } from './dto/request/create-category.request';
import { UpdateCategoryRequest } from './dto/request/update-category.request';
import { CategoryResponse } from './dto/response/category.response';
import { ApiResponseDto } from '@common/dto/api-response.dto';
import {
  GetOrgId,
  ORGANIZATION_HEADERS,
} from 'src/decorators/organization/get-org-id.decorator';
import { PermissionGuard } from '@guards/rbac-guard/permission.guard';
import { RequirePermission } from '@decorators/role/require-permission.decorator';
import { PERMISSIONS } from '@modules/rbac/constant/permission.constant';

@ApiTags('Document Categories')
@ApiBearerAuth('Authorization')
@ApiHeader({
  name: ORGANIZATION_HEADERS.X_ORGANIZATION_ID,
  description: 'ID tổ chức (bỏ trống nếu là system admin)',
  required: false,
})
@Controller({ path: 'documents/categories', version: '1' })
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  // TODO: sau này làm riêng api tạo category cho system admin
  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermission(PERMISSIONS.DOCUMENTS.CATEGORIES.CREATE)
  @ApiOperation({ summary: 'Tạo category mới cho org' })
  async create(
    @GetOrgId() orgId: string | undefined,
    @Body() dto: CreateCategoryRequest,
  ): Promise<ApiResponseDto<CategoryResponse>> {
    const data = await this.categoryService.create(orgId, dto);
    return new ApiResponseDto(201, 'Category created successfully', data);
  }

  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermission(PERMISSIONS.DOCUMENTS.CATEGORIES.LIST)
  @ApiOperation({ summary: 'Lấy danh sách categories (org + system-level)' })
  async findAll(
    @GetOrgId() orgId: string | undefined,
  ): Promise<ApiResponseDto<CategoryResponse[]>> {
    const data = await this.categoryService.findAll(orgId);
    return new ApiResponseDto(200, 'Fetched categories successfully', data);
  }

  @Get(':id')
  @UseGuards(PermissionGuard)
  @RequirePermission(PERMISSIONS.DOCUMENTS.CATEGORIES.VIEW)
  @ApiOperation({ summary: 'Lấy thông tin một category' })
  async findById(
    @Param('id', ParseUUIDPipe) categoryId: string,
  ): Promise<ApiResponseDto<CategoryResponse>> {
    const data = await this.categoryService.findById(categoryId);
    return new ApiResponseDto(200, 'Fetched category successfully', data);
  }

  // TODO: sau này làm riêng api cập nhật category cho system admin
  @Put(':id')
  @UseGuards(PermissionGuard)
  @RequirePermission(PERMISSIONS.DOCUMENTS.CATEGORIES.UPDATE)
  @ApiOperation({ summary: 'Cập nhật category' })
  async update(
    @Param('id', ParseUUIDPipe) categoryId: string,
    @Body() dto: UpdateCategoryRequest,
  ): Promise<ApiResponseDto<CategoryResponse>> {
    const data = await this.categoryService.update(categoryId, dto);
    return new ApiResponseDto(200, 'Category updated successfully', data);
  }

  @Delete(':id')
  @UseGuards(PermissionGuard)
  @RequirePermission(PERMISSIONS.DOCUMENTS.CATEGORIES.DELETE)
  @ApiOperation({ summary: 'Xoá category' })
  async delete(
    @Param('id', ParseUUIDPipe) categoryId: string,
  ): Promise<ApiResponseDto<void>> {
    await this.categoryService.delete(categoryId);
    return new ApiResponseDto(200, 'Category deleted successfully');
  }
}
