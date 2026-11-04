import { GetUser } from '@common/decorators/auth/get-user.decorator';
import { ApiResponseDto } from '@common/dto/api-response.dto';
import { RequirePermission } from '@decorators/role/require-permission.decorator';
import { ApiOperationAuto } from '@decorators/swagger/api-operation.decorator';
import { UpdateMyPresenceRequest } from '@modules/chat-box/presence/dto/request/update-my-presence.request';
import { PresenceResponse } from '@modules/chat-box/presence/dto/response/presence.response';
import { PresenceService } from '@modules/chat-box/presence/presence.service';
import { PERMISSIONS } from '@modules/rbac/constant/permission.constant';
import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import {
  GetOrgId,
  ORGANIZATION_HEADERS,
} from 'src/decorators/organization/get-org-id.decorator';
@ApiHeader({
  name: ORGANIZATION_HEADERS.X_ORGANIZATION_ID,
  description: 'UUID của organization (bắt buộc)',
  required: true,
})
@Controller({ path: 'chat-box', version: '1' })
@ApiBearerAuth('Authorization')
@ApiTags('Chat Box')
export class PresenceController {
  constructor(private readonly presenceService: PresenceService) {}

  @Put('presence/me')
  @RequirePermission(PERMISSIONS.CHAT.PRESENCE.UPDATE)
  @ApiOperationAuto(
    'Cập nhật presence của tôi',
    'Đổi trạng thái online/away/dnd/offline',
  )
  async updateMyPresence(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Body() dto: UpdateMyPresenceRequest,
  ): Promise<ApiResponseDto<PresenceResponse>> {
    const data = await this.presenceService.updateMyPresence(
      organizationId,
      userId,
      dto,
    );
    return new ApiResponseDto(200, 'Presence updated successfully', data);
  }

  @Get('presence')
  @RequirePermission(PERMISSIONS.CHAT.PRESENCE.VIEW)
  @ApiOperationAuto(
    'Lấy presence trong organization',
    'Danh sách presence của user trong org',
  )
  async listPresence(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
  ): Promise<ApiResponseDto<PresenceResponse[]>> {
    const data = await this.presenceService.listOrganizationPresence(
      organizationId,
      userId,
    );
    return new ApiResponseDto(
      200,
      'Fetched organization presence successfully',
      data,
    );
  }
}
