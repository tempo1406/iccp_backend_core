import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Put,
  UseGuards,
} from '@nestjs/common';
import { NotificationCoreService } from './notification-core.service';
import { GetUser } from '@common/decorators/auth/get-user.decorator';
import { Roles } from '@common/decorators/role/role.decorator';
import { SYSTEM_ROLES } from '@modules/rbac/constant/permission.constant';
import { LegacyInternalKeyGuard } from '@guards/internal-key-guard/legacy-internal-key.guard';
import { CreateNotificationDto } from './dto/request/create-notification.dto';
import { CleanupNotificationsRequest } from './dto/request/cleanup-notifications.request';
import { GetNotificationsQueryDto } from './dto/request/get-notifications-query.dto';
import { MarkAllNotificationsReadQuery } from './dto/request/mark-all-notifications-read.query';
import { MarkReadNotificationsDto } from './dto/request/mark-read-notifications.dto';
import { ApiResponseDto } from '@common/dto/api-response.dto';
import { Notification } from './entities/notification.entity';
import { NotificationsListResponse } from './dto/response/notifications-list.response';
import { ApiOperationAuto } from '@common/decorators/swagger/api-operation.decorator';
import { ApiBearerAuth, ApiHeader, ApiParam, ApiTags } from '@nestjs/swagger';
import {
  GetOrgId,
  ORGANIZATION_HEADERS,
} from 'src/decorators/organization/get-org-id.decorator';

@ApiTags('Notifications CORE')
@ApiBearerAuth('Authorization')
@Controller({
  version: '1',
  path: 'notifications',
})
export class NotificationCoreController {
  constructor(
    private readonly notificationCoreService: NotificationCoreService,
  ) {}

  @Get()
  @ApiHeader({
    name: ORGANIZATION_HEADERS.X_ORGANIZATION_ID,
    required: false,
    description:
      'Optional organization scope for tenant-aware notification feeds.',
  })
  @ApiOperationAuto(
    'Get my notifications',
    'Supports pagination, unreadOnly filtering, and optional organization scoping via x-organization-id.',
  )
  async findAll(
    @GetUser('sub') userId: string,
    @GetOrgId() organizationId: string | undefined,
    @Query() query: GetNotificationsQueryDto,
  ): Promise<ApiResponseDto<NotificationsListResponse>> {
    const data = await this.notificationCoreService.findByUser(
      userId,
      query,
      organizationId,
    );
    return new ApiResponseDto(200, 'Fetched notifications successfully', data);
  }

  @Put('read')
  @ApiOperationAuto(
    'Mark many notifications as read',
    'Marks the provided notification ids as read for the current user.',
  )
  async markManyAsRead(
    @Body() body: MarkReadNotificationsDto,
    @GetUser('sub') userId: string,
  ): Promise<ApiResponseDto<{ updated: number }>> {
    const updated = await this.notificationCoreService.markManyAsRead(
      userId,
      body.ids,
    );
    return new ApiResponseDto(200, 'Notifications marked as read', { updated });
  }

  @Put('read-all')
  @ApiOperationAuto(
    'Mark notifications as read in bulk',
    'Marks unread notifications as read for the current user. Optional organizationId and roomId filters can narrow the scope.',
  )
  async markAllAsRead(
    @GetUser('sub') userId: string,
    @Body() payload?: MarkAllNotificationsReadQuery,
  ): Promise<ApiResponseDto<{ updatedCount: number }>> {
    const updatedCount = await this.notificationCoreService.markAllAsRead(
      userId,
      payload,
    );
    return new ApiResponseDto(200, 'Notifications marked as read', {
      updatedCount,
    });
  }

  @Put(':id/read')
  @ApiParam({
    name: 'id',
    description: 'Notification UUID to mark as read',
    type: String,
  })
  @ApiOperationAuto(
    'Mark one notification as read',
    'Marks a notification that belongs to the current user as read.',
  )
  async markAsRead(
    @Param('id') id: string,
    @GetUser('sub') userId: string,
  ): Promise<ApiResponseDto<void>> {
    await this.notificationCoreService.markAsRead(id, userId);
    return new ApiResponseDto(200, 'Notification marked as read');
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    description: 'Notification UUID to soft delete',
    type: String,
  })
  @ApiOperationAuto(
    'Delete a notification',
    'Soft deletes a notification that belongs to the current user.',
  )
  async remove(
    @Param('id') id: string,
    @GetUser('sub') userId: string,
  ): Promise<ApiResponseDto<{ success: boolean }>> {
    const success = await this.notificationCoreService.remove(userId, id);
    return new ApiResponseDto(200, 'Notification deleted successfully', {
      success,
    });
  }

  @Post('system-admin')
  @Roles(SYSTEM_ROLES.SYSTEM_ADMIN)
  @ApiOperationAuto(
    '[SYSTEM_ADMIN] Create a notification for a user',
    'Creates a notification and pushes it to the target user via websocket.',
  )
  async createBySystemAdmin(
    @Body() dto: CreateNotificationDto,
  ): Promise<ApiResponseDto<Notification | null>> {
    const data = await this.notificationCoreService.createBySystemAdmin(dto);
    return new ApiResponseDto(201, 'Notification created successfully', data);
  }

  @UseGuards(LegacyInternalKeyGuard)
  @Post('internal')
  @ApiOperationAuto(
    '[INTERNAL] Create a notification for a user',
    'Creates a notification from trusted internal services using X-Internal-Key.',
  )
  async createInternal(
    @Body() dto: CreateNotificationDto,
  ): Promise<ApiResponseDto<Notification | null>> {
    const data = await this.notificationCoreService.createBySystemAdmin(dto);
    return new ApiResponseDto(201, 'Notification created successfully', data);
  }

  @Put('system-admin/cleanup')
  @Roles(SYSTEM_ROLES.SYSTEM_ADMIN)
  @ApiOperationAuto(
    '[SYSTEM_ADMIN] Cleanup old notifications',
    'Permanently deletes old notifications using read and hard retention thresholds.',
  )
  async cleanupOldNotifications(
    @Body() payload: CleanupNotificationsRequest,
  ): Promise<
    ApiResponseDto<{
      deletedCount: number;
      readThresholdAt: string;
      hardThresholdAt: string;
    }>
  > {
    const data =
      await this.notificationCoreService.cleanupOldNotifications(payload);
    return new ApiResponseDto(200, 'Notifications cleanup completed', data);
  }
}
