import { GetUser } from '@common/decorators/auth/get-user.decorator';
import { ApiResponseDto } from '@common/dto/api-response.dto';
import { PaginatedResponse } from '@common/dto/paginated.response';
import { RequirePermission } from '@decorators/role/require-permission.decorator';
import { ApiOperationAuto } from '@decorators/swagger/api-operation.decorator';
import { CreateRoomRequest } from '@modules/chat-box/room-management/dto/request/create-room.request';
import { GetCreateRoomCandidatesQueryRequest } from '@modules/chat-box/room-management/dto/request/get-create-room-candidates-query.request';
import { DiscoverPublicRoomsQueryRequest } from '@modules/chat-box/room-management/dto/request/discover-public-rooms-query.request';
import { GetRoomBootstrapQueryRequest } from '@modules/chat-box/room-management/dto/request/get-room-bootstrap-query.request';
import { GetRoomDetailQueryRequest } from '@modules/chat-box/room-management/dto/request/get-room-detail-query.request';
import { GetInviteCandidatesQueryRequest } from '@modules/chat-box/room-management/dto/request/get-invite-candidates-query.request';
import { InviteRoomMembersRequest } from '@modules/chat-box/room-management/dto/request/invite-room-members.request';
import { ListRoomsQueryRequest } from '@modules/chat-box/room-management/dto/request/list-rooms-query.request';
import { UpdateMyRoomNotifySettingsRequest } from '@modules/chat-box/room-management/dto/request/update-my-room-notify-settings.request';
import { UpdateMyRoomVisibilityRequest } from '@modules/chat-box/room-management/dto/request/update-my-room-visibility.request';
import { UpdateRoomInfoRequest } from '@modules/chat-box/room-management/dto/request/update-room-info.request';
import { UpdateRoomOwnershipRequest } from '@modules/chat-box/room-management/dto/request/update-room-ownership.request';
import { UpdateRoomVisibilityRequest } from '@modules/chat-box/room-management/dto/request/update-room-visibility.request';
import { UpdateRoomMemberRoleRequest } from '@modules/chat-box/room-management/dto/request/update-room-member-role.request';
import { UpdateRoomPoliciesRequest } from '@modules/chat-box/room-management/dto/request/update-room-policies.request';
import { UpdateRoomTabsRequest } from '@modules/chat-box/room-management/dto/request/update-room-tabs.request';
import { AcceptInvitationResponse } from '@modules/chat-box/room-management/dto/response/accept-invitation.response';
import { CreateRoomCandidatesResponse } from '@modules/chat-box/room-management/dto/response/create-room-candidate.response';
import { DiscoverPublicRoomsResponse } from '@modules/chat-box/room-management/dto/response/discover-public-rooms.response';
import { JoinRoomResponse } from '@modules/chat-box/room-management/dto/response/join-room.response';
import { RoomDetailResponse } from '@modules/chat-box/room-management/dto/response/room-detail.response';
import { RoomInviteCandidatesResponse } from '@modules/chat-box/room-management/dto/response/room-invite-candidate.response';
import { RoomInvitationResponse } from '@modules/chat-box/room-management/dto/response/room-invitation.response';
import { RoomBootstrapResponse } from '@modules/chat-box/room-management/dto/response/room-bootstrap.response';
import { RoomPreviewResponse } from '@modules/chat-box/room-management/dto/response/room-preview.response';
import { RoomSummaryResponse } from '@modules/chat-box/room-management/dto/response/room-summary.response';
import { RoomTabsResponse } from '@modules/chat-box/room-management/dto/response/room-tabs.response';
import { RemoveRoomMemberResponse } from '@modules/chat-box/room-management/dto/response/remove-room-member.response';
import { UpdateMyRoomNotifySettingsResponse } from '@modules/chat-box/room-management/dto/response/update-my-room-notify-settings.response';
import { UpdateMyRoomVisibilityResponse } from '@modules/chat-box/room-management/dto/response/update-my-room-visibility.response';
import { UpdateRoomArchiveResponse } from '@modules/chat-box/room-management/dto/response/update-room-archive.response';
import { UpdateRoomInfoResponse } from '@modules/chat-box/room-management/dto/response/update-room-info.response';
import { UpdateRoomMemberRoleResponse } from '@modules/chat-box/room-management/dto/response/update-room-member-role.response';
import { UpdateRoomOwnershipResponse } from '@modules/chat-box/room-management/dto/response/update-room-ownership.response';
import { UpdateRoomPoliciesResponse } from '@modules/chat-box/room-management/dto/response/update-room-policies.response';
import { UpdateRoomVisibilityResponse } from '@modules/chat-box/room-management/dto/response/update-room-visibility.response';
import { UpdateRoomStarResponse } from '@modules/chat-box/room-management/dto/response/update-room-star.response';
import { RoomManagementService } from '@modules/chat-box/room-management/room-management.service';
import { PERMISSIONS } from '@modules/rbac/constant/permission.constant';
import { RbacService } from '@modules/rbac/rbac.service';
import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiParam, ApiTags } from '@nestjs/swagger';
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
export class RoomManagementController {
  constructor(
    private readonly roomManagementService: RoomManagementService,
    private readonly rbacService: RbacService,
  ) {}

  @Post('rooms')
  @RequirePermission(PERMISSIONS.CHAT.ROOMS.CREATE)
  @ApiOperationAuto(
    'Tạo room chat',
    'Tạo channel/DM/group DM trong organization. ' +
      'contextScope hỗ trợ: organization | project | department. ' +
      'Nếu contextScope = organization thì không cần contextId. ' +
      'Nếu contextScope = project/department thì bắt buộc có contextId. ' +
      'Mặc định quyền pin: channel=false, dm/group_dm=true cho member.',
  )
  async createRoom(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Body() dto: CreateRoomRequest,
  ): Promise<ApiResponseDto<RoomDetailResponse>> {
    const data = await this.roomManagementService.createRoom(
      organizationId,
      userId,
      dto,
    );
    return new ApiResponseDto(201, 'Chat room created successfully', data);
  }

  @Get('rooms')
  @RequirePermission(PERMISSIONS.CHAT.ROOMS.LIST)
  @ApiOperationAuto(
    'Lấy danh sách room của tôi',
    'Lấy các room mà user hiện tại đã tham gia. ' +
      'includeArchived = false (mặc định): chỉ lấy room chưa archive. ' +
      'includeArchived = true: lấy cả room đã archive và chưa archive.',
  )
  async listMyRooms(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Query() query: ListRoomsQueryRequest,
  ): Promise<ApiResponseDto<PaginatedResponse<RoomSummaryResponse>>> {
    const data = await this.roomManagementService.listMyRooms(
      organizationId,
      userId,
      query,
    );
    return new ApiResponseDto(200, 'Fetched chat rooms successfully', data);
  }

  @Get('rooms/discover')
  @RequirePermission(PERMISSIONS.CHAT.ROOMS.LIST)
  @ApiOperationAuto(
    'Discover public channels',
    'Lay danh sach channel public de browse/join cho user hien tai',
  )
  async discoverPublicRooms(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Query() query: DiscoverPublicRoomsQueryRequest,
  ): Promise<ApiResponseDto<DiscoverPublicRoomsResponse>> {
    const data = await this.roomManagementService.discoverPublicRooms(
      organizationId,
      userId,
      query,
    );
    return new ApiResponseDto(
      200,
      'Discovered public channels successfully',
      data,
    );
  }

  @Get('rooms/create-candidates')
  @RequirePermission(PERMISSIONS.CHAT.ROOMS.CREATE)
  @ApiOperationAuto(
    'Lay danh sach candidates cho flow tao room',
    'API chat-scoped cho create dialog (uu tien group_dm), enforce organization/project scope va tra ve trang thai eligible cua tung user.',
  )
  async listCreateRoomCandidates(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Query() query: GetCreateRoomCandidatesQueryRequest,
  ): Promise<ApiResponseDto<CreateRoomCandidatesResponse>> {
    const data = await this.roomManagementService.listCreateRoomCandidates(
      organizationId,
      userId,
      query,
    );
    return new ApiResponseDto(
      200,
      'Fetched create room candidates successfully',
      data,
    );
  }

  @Get('rooms/:roomId')
  @RequirePermission(PERMISSIONS.CHAT.ROOMS.VIEW)
  @ApiParam({ name: 'roomId', description: 'UUID của room', type: String })
  @ApiOperationAuto(
    'Lấy chi tiết room',
    'Trả về room + danh sách member + quyền của tôi trong room',
  )
  async getRoomDetail(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Query() query: GetRoomDetailQueryRequest,
  ): Promise<ApiResponseDto<RoomDetailResponse>> {
    const data = await this.roomManagementService.getRoomDetail(
      organizationId,
      roomId,
      userId,
      { includeMembers: query.includeMembers },
    );
    return new ApiResponseDto(
      200,
      'Fetched chat room detail successfully',
      data,
    );
  }

  @Get('rooms/:roomId/bootstrap')
  @RequirePermission(PERMISSIONS.CHAT.ROOMS.VIEW)
  @ApiParam({ name: 'roomId', description: 'UUID cua room', type: String })
  @ApiOperationAuto(
    'Lay payload bootstrap cho room cold-open',
    'Tra ve room detail light + tabs + first message page + draft + pinned + read-state de FE giam request fan-out khi open room.',
  )
  async getRoomBootstrap(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Query() query: GetRoomBootstrapQueryRequest,
  ): Promise<ApiResponseDto<RoomBootstrapResponse>> {
    const data = await this.roomManagementService.getRoomBootstrap(
      organizationId,
      roomId,
      userId,
      query,
    );
    return new ApiResponseDto(
      200,
      'Fetched room bootstrap successfully',
      data,
    );
  }

  @Get('rooms/:roomId/preview')
  @RequirePermission(PERMISSIONS.CHAT.ROOMS.VIEW)
  @ApiParam({ name: 'roomId', description: 'UUID cua room', type: String })
  @ApiOperationAuto(
    'Lay room preview',
    'Lay metadata preview cho public channel/non-member deep link',
  )
  async getRoomPreview(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
  ): Promise<ApiResponseDto<RoomPreviewResponse>> {
    const data = await this.roomManagementService.getRoomPreview(
      organizationId,
      roomId,
      userId,
    );
    return new ApiResponseDto(200, 'Fetched room preview successfully', data);
  }

  @Put('rooms/:roomId')
  @RequirePermission(PERMISSIONS.CHAT.ROOMS.UPDATE)
  @ApiParam({ name: 'roomId', description: 'UUID room', type: String })
  @ApiOperationAuto(
    'Cap nhat thong tin room',
    'Cap nhat name/topic/description cho room. DM khong cho phep doi thong tin; channel/group_dm chi owner/admin duoc sua.',
  )
  async updateRoomInfo(
    @GetOrgId() organizationId: string,
    @GetUser('sub') callerId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() dto: UpdateRoomInfoRequest,
  ): Promise<ApiResponseDto<UpdateRoomInfoResponse>> {
    const data = await this.roomManagementService.updateRoomInfo(
      organizationId,
      roomId,
      callerId,
      dto,
    );
    const message = data.updated
      ? 'Room info updated successfully'
      : 'No room info change: submitted values are identical to current room info';
    return new ApiResponseDto(200, message, data);
  }

  @Put('rooms/:roomId/visibility')
  @RequirePermission(PERMISSIONS.CHAT.ROOMS.UPDATE)
  @ApiParam({ name: 'roomId', description: 'UUID room', type: String })
  @ApiOperationAuto(
    'Cap nhat visibility room',
    'Doi channel visibility public/private, khong ap dung cho room archived.',
  )
  async updateRoomVisibility(
    @GetOrgId() organizationId: string,
    @GetUser('sub') callerId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() dto: UpdateRoomVisibilityRequest,
  ): Promise<ApiResponseDto<UpdateRoomVisibilityResponse>> {
    const data = await this.roomManagementService.updateRoomVisibility(
      organizationId,
      roomId,
      callerId,
      dto,
    );
    const message = data.updated
      ? 'Room visibility updated successfully'
      : 'No visibility change: submitted visibility is identical to current room state';
    return new ApiResponseDto(200, message, data);
  }

  @Put('rooms/:roomId/archive')
  @RequirePermission(PERMISSIONS.CHAT.ROOMS.UPDATE)
  @ApiParam({ name: 'roomId', description: 'UUID room', type: String })
  @ApiOperationAuto(
    'Archive room',
    'Danh dau room sang trang thai archived (read-only cho message moi).',
  )
  async archiveRoom(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
  ): Promise<ApiResponseDto<UpdateRoomArchiveResponse>> {
    const data = await this.roomManagementService.archiveRoom(
      organizationId,
      roomId,
      userId,
    );
    const message = data.updated
      ? 'Room archived successfully'
      : 'No archive change: this room is already archived';
    return new ApiResponseDto(200, message, data);
  }

  @Put('rooms/:roomId/unarchive')
  @RequirePermission(PERMISSIONS.CHAT.ROOMS.UPDATE)
  @ApiParam({ name: 'roomId', description: 'UUID room', type: String })
  @ApiOperationAuto(
    'Unarchive room',
    'Khoi phuc room tu trang thai archived ve active.',
  )
  async unarchiveRoom(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
  ): Promise<ApiResponseDto<UpdateRoomArchiveResponse>> {
    const data = await this.roomManagementService.unarchiveRoom(
      organizationId,
      roomId,
      userId,
    );
    const message = data.updated
      ? 'Room unarchived successfully'
      : 'No archive change: this room is already active';
    return new ApiResponseDto(200, message, data);
  }

  @Get('rooms/:roomId/tabs')
  @RequirePermission(PERMISSIONS.CHAT.ROOMS.VIEW)
  @ApiParam({ name: 'roomId', description: 'UUID room', type: String })
  @ApiOperationAuto(
    'Lay room tabs config',
    'Lay cau hinh tab hien thi tren room header de FE render theo dung thu tu/hide state.',
  )
  async getRoomTabs(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
  ): Promise<ApiResponseDto<RoomTabsResponse>> {
    const data = await this.roomManagementService.getRoomTabs(
      organizationId,
      roomId,
      userId,
    );
    return new ApiResponseDto(200, 'Fetched room tabs successfully', data);
  }

  @Put('rooms/:roomId/tabs')
  @RequirePermission(PERMISSIONS.CHAT.ROOMS.UPDATE)
  @ApiParam({ name: 'roomId', description: 'UUID room', type: String })
  @ApiOperationAuto(
    'Cap nhat room tabs config',
    'Luu reorder + hide/show tabs de dong bo cho toan bo member room.',
  )
  async updateRoomTabs(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() dto: UpdateRoomTabsRequest,
  ): Promise<ApiResponseDto<RoomTabsResponse>> {
    const data = await this.roomManagementService.updateRoomTabs(
      organizationId,
      roomId,
      userId,
      dto,
    );
    const message = data.updated
      ? 'Room tabs updated successfully'
      : 'No tabs change: submitted tabs are identical to current config';
    return new ApiResponseDto(200, message, data);
  }

  @Put('rooms/:roomId/star')
  @RequirePermission(PERMISSIONS.CHAT.ROOMS.VIEW)
  @ApiParam({ name: 'roomId', description: 'UUID room', type: String })
  @ApiOperationAuto(
    'Star room',
    'Danh dau room vao muc Starred cua user hien tai',
  )
  async starRoom(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
  ): Promise<ApiResponseDto<UpdateRoomStarResponse>> {
    const data = await this.roomManagementService.starRoom(
      organizationId,
      roomId,
      userId,
    );
    const message = data.updated
      ? 'Room starred successfully'
      : 'No star change: this room is already starred';
    return new ApiResponseDto(200, message, data);
  }

  @Delete('rooms/:roomId/star')
  @RequirePermission(PERMISSIONS.CHAT.ROOMS.VIEW)
  @ApiParam({ name: 'roomId', description: 'UUID room', type: String })
  @ApiOperationAuto('Unstar room', 'Bo room khoi muc Starred cua user hien tai')
  async unstarRoom(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
  ): Promise<ApiResponseDto<UpdateRoomStarResponse>> {
    const data = await this.roomManagementService.unstarRoom(
      organizationId,
      roomId,
      userId,
    );
    const message = data.updated
      ? 'Room unstarred successfully'
      : 'No star change: this room is not starred';
    return new ApiResponseDto(200, message, data);
  }

  @Put('rooms/:roomId/policies')
  @RequirePermission(PERMISSIONS.CHAT.ROOMS.UPDATE)
  @ApiParam({ name: 'roomId', description: 'UUID room', type: String })
  @ApiOperationAuto(
    'Cập nhật chính sách room',
    'Cập nhật chính sách pin ở cấp room. ' +
      'Chỉ owner/admin được sửa với channel/group DM. ' +
      'Room DM có policy cố định và không thể chỉnh.',
  )
  async updateRoomPolicies(
    @GetOrgId() organizationId: string,
    @GetUser('sub') callerId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() dto: UpdateRoomPoliciesRequest,
  ): Promise<ApiResponseDto<UpdateRoomPoliciesResponse>> {
    const data = await this.roomManagementService.updateRoomPolicies(
      organizationId,
      roomId,
      callerId,
      dto,
    );
    const message = data.updated
      ? 'Room policies updated successfully'
      : 'No policy change: submitted values are identical to current room policies';
    return new ApiResponseDto(200, message, data);
  }

  @Post('rooms/:roomId/join')
  @RequirePermission(PERMISSIONS.CHAT.MEMBERS.ADD)
  @ApiParam({
    name: 'roomId',
    description: 'UUID room public cần join',
    type: String,
  })
  @ApiOperationAuto('Tham gia room public', 'Tham gia vào room public')
  async joinPublicRoom(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
  ): Promise<ApiResponseDto<JoinRoomResponse>> {
    const data = await this.roomManagementService.joinPublicRoom(
      organizationId,
      roomId,
      userId,
    );
    const message = data.joined
      ? 'Joined room successfully'
      : 'No membership change: you are already an active member of this room';
    return new ApiResponseDto(200, message, data);
  }

  @Get('rooms/:roomId/invite-candidates')
  @RequirePermission(PERMISSIONS.CHAT.MEMBERS.INVITE)
  @ApiParam({
    name: 'roomId',
    description: 'UUID room can lay danh sach user de moi',
    type: String,
  })
  @ApiOperationAuto(
    'Lay danh sach invite candidates',
    'API chat-scoped de FE tim user co the moi vao room ma khong phu thuoc tenant.members.list',
  )
  async listInviteCandidates(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Query() query: GetInviteCandidatesQueryRequest,
  ): Promise<ApiResponseDto<RoomInviteCandidatesResponse>> {
    const data = await this.roomManagementService.listInviteCandidates(
      organizationId,
      roomId,
      userId,
      query,
    );
    return new ApiResponseDto(200, 'Fetched room invite candidates successfully', data);
  }

  @Post('rooms/:roomId/invitations')
  @RequirePermission(PERMISSIONS.CHAT.MEMBERS.INVITE)
  @ApiParam({
    name: 'roomId',
    description: 'UUID room cần mời member',
    type: String,
  })
  @ApiOperationAuto(
    'Mời member vào room',
    'Với channel private thì ưu tiên owner mời; các role khác sẽ bị giới hạn quyền mời.',
  )
  async inviteMembers(
    @GetOrgId() organizationId: string,
    @GetUser('sub') inviterId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() dto: InviteRoomMembersRequest,
  ): Promise<ApiResponseDto<RoomInvitationResponse[]>> {
    const data = await this.roomManagementService.inviteMembers(
      organizationId,
      roomId,
      inviterId,
      dto,
    );
    const message =
      data.length > 0
        ? 'Room invitations processed successfully'
        : 'No invitations created: all target users are already members or no valid target users were provided';
    return new ApiResponseDto(200, message, data);
  }

  @Post('invitations/:invitationId/accept')
  @RequirePermission(PERMISSIONS.CHAT.MEMBERS.ADD)
  @ApiParam({
    name: 'invitationId',
    description: 'UUID của room invitation',
    type: String,
  })
  @ApiOperationAuto(
    'Chấp nhận lời mời',
    'Người được mời tự chấp nhận lời mời để vào room',
  )
  async acceptInvitation(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
  ): Promise<ApiResponseDto<AcceptInvitationResponse>> {
    const data = await this.roomManagementService.acceptInvitation(
      organizationId,
      invitationId,
      userId,
    );
    const message = data.alreadyAccepted
      ? 'Invitation already accepted'
      : 'Invitation accepted successfully';
    return new ApiResponseDto(200, message, data);
  }

  @Put('rooms/:roomId/members/:memberId/role')
  @RequirePermission(PERMISSIONS.CHAT.MEMBERS.UPDATE)
  @ApiParam({ name: 'roomId', description: 'UUID room', type: String })
  @ApiParam({ name: 'memberId', description: 'UUID user member', type: String })
  @ApiOperationAuto(
    'Cập nhật role member',
    'Owner/Admin cập nhật role owner/admin/member/guest cho member trong room.',
  )
  async updateMemberRole(
    @GetOrgId() organizationId: string,
    @GetUser('sub') callerId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: UpdateRoomMemberRoleRequest,
  ): Promise<ApiResponseDto<UpdateRoomMemberRoleResponse>> {
    const data = await this.roomManagementService.updateMemberRole(
      organizationId,
      roomId,
      memberId,
      callerId,
      dto,
    );
    const message = data.updated
      ? 'Room member role updated successfully'
      : `No role change: target member already has role '${data.currentRole}', so no update was applied`;
    return new ApiResponseDto(200, message, data);
  }

  @Put('rooms/:roomId/ownership')
  @RequirePermission(PERMISSIONS.CHAT.MEMBERS.UPDATE)
  @ApiParam({ name: 'roomId', description: 'UUID room', type: String })
  @ApiOperationAuto(
    'Transfer room ownership',
    'Owner hien tai transfer ownership sang active member khac trong room',
  )
  async transferRoomOwnership(
    @GetOrgId() organizationId: string,
    @GetUser('sub') callerId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() dto: UpdateRoomOwnershipRequest,
  ): Promise<ApiResponseDto<UpdateRoomOwnershipResponse>> {
    const data = await this.roomManagementService.transferRoomOwnership(
      organizationId,
      roomId,
      callerId,
      dto,
    );
    const message = data.updated
      ? 'Room ownership transferred successfully'
      : 'No ownership change: target member is already room owner';
    return new ApiResponseDto(200, message, data);
  }

  @Put('rooms/:roomId/members/me/notify-settings')
  @RequirePermission(PERMISSIONS.CHAT.MEMBERS.UPDATE)
  @ApiParam({ name: 'roomId', description: 'UUID room', type: String })
  @ApiOperationAuto(
    'Cập nhật notify settings của tôi trong room',
    'Cho phép user tự đổi mức nhận thông báo theo room: all/mentions/mute và muteUntil.',
  )
  async updateMyRoomNotifySettings(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() dto: UpdateMyRoomNotifySettingsRequest,
  ): Promise<ApiResponseDto<UpdateMyRoomNotifySettingsResponse>> {
    const data = await this.roomManagementService.updateMyRoomNotifySettings(
      organizationId,
      roomId,
      userId,
      dto,
    );
    const message = data.updated
      ? 'Room notify settings updated successfully'
      : 'No notify settings change: submitted values are identical to current settings';
    return new ApiResponseDto(200, message, data);
  }

  @Put('rooms/:roomId/members/me/visibility')
  @RequirePermission(PERMISSIONS.CHAT.MEMBERS.UPDATE)
  @ApiParam({ name: 'roomId', description: 'UUID room', type: String })
  @ApiOperationAuto(
    'Cap nhat visibility cua toi trong room',
    'Cho phep user hide/unhide room khoi sidebar chinh.',
  )
  async updateMyRoomVisibility(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() dto: UpdateMyRoomVisibilityRequest,
  ): Promise<ApiResponseDto<UpdateMyRoomVisibilityResponse>> {
    const data = await this.roomManagementService.updateMyRoomVisibility(
      organizationId,
      roomId,
      userId,
      dto,
    );
    const message = data.updated
      ? 'Room visibility updated successfully'
      : 'No visibility change: submitted visibility is identical to current state';
    return new ApiResponseDto(200, message, data);
  }

  @Delete('rooms/:roomId/members/:memberId')
  @ApiParam({ name: 'roomId', description: 'UUID room', type: String })
  @ApiParam({ name: 'memberId', description: 'UUID user member', type: String })
  @ApiOperationAuto('Xóa/Rời member', 'Loại member khỏi room hoặc tự rời room')
  async removeMember(
    @GetOrgId() organizationId: string,
    @GetUser('sub') callerId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ): Promise<ApiResponseDto<RemoveRoomMemberResponse>> {
    if (memberId !== callerId) {
      const canRemoveMembers = await this.rbacService.hasPermission(
        callerId,
        PERMISSIONS.CHAT.MEMBERS.REMOVE,
        organizationId,
      );
      if (!canRemoveMembers) {
        throw new ForbiddenException(
          'You do not have permission to remove members',
        );
      }
    }

    const data = await this.roomManagementService.removeMember(
      organizationId,
      roomId,
      memberId,
      callerId,
    );
    const action = data.removedBySelf
      ? 'Left room successfully'
      : 'Room member removed successfully';
    const message = data.transferredOwnerUserId
      ? `${action} and ownership transferred`
      : action;
    return new ApiResponseDto(200, message, data);
  }
}
