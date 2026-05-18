import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '@common/decorators/auth/get-user.decorator';
import { ApiResponseDto } from '@common/dto/api-response.dto';
import { UpdateProfileRequest } from './dto/request/update-profile.request';
import { ChangePasswordRequest } from './dto/request/change-password.request';
import { CreateUserRequest } from './dto/request/create-user.request';
import { UserResponse } from './dto/response/user.response';
import { PermissionGuard } from '@guards/rbac-guard/permission.guard';
import { RolesGuard } from '@guards/rbac-guard/roles.guard';
import { RequirePermission } from '@common/decorators/role/require-permission.decorator';
import { Roles } from '@common/decorators/role/role.decorator';
import {
  PERMISSIONS,
  SYSTEM_ROLES,
} from '@modules/rbac/constant/permission.constant';
import { GetUsersQueryRequest } from './dto/request/get-users-query.request';
import { PaginatedResponse } from '@common/dto/paginated.response';

@ApiTags('Users')
@ApiBearerAuth('Authorization')
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Lấy thông tin cá nhân của user đang đăng nhập' })
  async getMe(
    @GetUser('sub') userId: string,
  ): Promise<ApiResponseDto<UserResponse>> {
    const data = await this.usersService.getMe(userId);
    return new ApiResponseDto(200, 'Profile fetched successfully', data);
  }

  @Put('me')
  @ApiOperation({ summary: 'Cập nhật profile cá nhân' })
  async updateProfile(
    @GetUser('sub') userId: string,
    @Body() dto: UpdateProfileRequest,
  ): Promise<ApiResponseDto<UserResponse>> {
    const data = await this.usersService.updateProfile(userId, dto);
    return new ApiResponseDto(200, 'Profile updated successfully', data);
  }

  @Post('me/change-password')
  @ApiOperation({
    summary: 'Đổi mật khẩu (nhập mật khẩu cũ và mật khẩu mới, không cần OTP)',
  })
  async changePassword(
    @GetUser('sub') userId: string,
    @Body() dto: ChangePasswordRequest,
  ): Promise<ApiResponseDto<void>> {
    await this.usersService.changePassword(
      userId,
      dto.oldPassword,
      dto.newPassword,
    );
    return new ApiResponseDto(200, 'Password changed successfully');
  }

  // Admin endpoints (system_admin role + permission)
  @Get()
  @UseGuards(RolesGuard, PermissionGuard)
  @Roles(SYSTEM_ROLES.SYSTEM_ADMIN)
  @RequirePermission(PERMISSIONS.USERS.LIST)
  @ApiOperation({ summary: '[Admin] Lấy danh sách users (phân trang)' })
  async getAllUsers(
    @Query() query: GetUsersQueryRequest,
  ): Promise<ApiResponseDto<PaginatedResponse<UserResponse>>> {
    const data = await this.usersService.findAll(query);
    return new ApiResponseDto(200, 'Users fetched successfully', data);
  }

  @Post()
  @UseGuards(RolesGuard, PermissionGuard)
  @Roles(SYSTEM_ROLES.SYSTEM_ADMIN)
  @RequirePermission(PERMISSIONS.USERS.CREATE)
  @ApiOperation({
    summary: '[Admin] Tạo user mới (auto verify, không cần OTP)',
  })
  async createUser(
    @Body() dto: CreateUserRequest,
  ): Promise<ApiResponseDto<void>> {
    await this.usersService.adminCreateUser(dto);
    return new ApiResponseDto(201, 'User created successfully');
  }

  @Delete(':id')
  @UseGuards(RolesGuard, PermissionGuard)
  @Roles(SYSTEM_ROLES.SYSTEM_ADMIN)
  @RequirePermission(PERMISSIONS.USERS.DELETE)
  @ApiOperation({ summary: '[Admin] Xoá user' })
  async deleteUser(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<void>> {
    await this.usersService.deleteUser(id);
    return new ApiResponseDto(200, 'User deleted successfully');
  }

  @Put(':id/ban')
  @UseGuards(RolesGuard, PermissionGuard)
  @Roles(SYSTEM_ROLES.SYSTEM_ADMIN)
  @RequirePermission(PERMISSIONS.USERS.DEACTIVATE)
  @ApiOperation({ summary: '[Admin] Ban user (set isActive = false)' })
  async banUser(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<void>> {
    await this.usersService.banUser(id);
    return new ApiResponseDto(200, 'User banned successfully');
  }

  @Put(':id/unban')
  @UseGuards(RolesGuard, PermissionGuard)
  @Roles(SYSTEM_ROLES.SYSTEM_ADMIN)
  @RequirePermission(PERMISSIONS.USERS.ACTIVATE)
  @ApiOperation({ summary: '[Admin] Unban user (set isActive = true)' })
  async unbanUser(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<void>> {
    await this.usersService.unbanUser(id);
    return new ApiResponseDto(200, 'User unbanned successfully');
  }
}
