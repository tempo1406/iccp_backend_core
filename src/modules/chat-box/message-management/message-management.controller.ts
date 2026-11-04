import { GetUser } from '@common/decorators/auth/get-user.decorator';
import { ApiResponseDto } from '@common/dto/api-response.dto';
import { PaginatedResponse } from '@common/dto/paginated.response';
import { RequirePermission } from '@decorators/role/require-permission.decorator';
import { ApiOperationAuto } from '@decorators/swagger/api-operation.decorator';
import { AddMessageReactionRequest } from '@modules/chat-box/message-management/dto/request/add-message-reaction.request';
import { CompleteDirectUploadAttachmentRequest } from '@modules/chat-box/message-management/dto/request/complete-direct-upload-attachment.request';
import { CreateScheduledMessageRequest } from '@modules/chat-box/message-management/dto/request/create-scheduled-message.request';
import { ForwardMessageRequest } from '@modules/chat-box/message-management/dto/request/forward-message.request';
import { GetMessageLinkPreviewQueryRequest } from '@modules/chat-box/message-management/dto/request/get-message-link-preview-query.request';
import { GetRoomMessageContextQueryRequest } from '@modules/chat-box/message-management/dto/request/get-room-message-context-query.request';
import { GetCurrentDraftQueryRequest } from '@modules/chat-box/message-management/dto/request/get-current-draft-query.request';
import { ListMessageReactionsBatchQueryRequest } from '@modules/chat-box/message-management/dto/request/list-message-reactions-batch-query.request';
import { ListMyDraftsQueryRequest } from '@modules/chat-box/message-management/dto/request/list-my-drafts-query.request';
import { ListMyMentionsQueryRequest } from '@modules/chat-box/message-management/dto/request/list-my-mentions-query.request';
import { ListMyScheduledMessagesQueryRequest } from '@modules/chat-box/message-management/dto/request/list-my-scheduled-messages-query.request';
import { ListRoomAttachmentsQueryRequest } from '@modules/chat-box/message-management/dto/request/list-room-attachments-query.request';
import { ListRoomMessagesCursorQueryRequest } from '@modules/chat-box/message-management/dto/request/list-room-messages-cursor-query.request';
import { ListRoomMessagesQueryRequest } from '@modules/chat-box/message-management/dto/request/list-room-messages-query.request';
import { MarkMyMentionsReadRequest } from '@modules/chat-box/message-management/dto/request/mark-my-mentions-read.request';
import { MarkPersonalInboxRoomReadRequest } from '@modules/chat-box/message-management/dto/request/mark-personal-inbox-room-read.request';
import { RemoveMessageReactionQueryRequest } from '@modules/chat-box/message-management/dto/request/remove-message-reaction-query.request';
import { RequestDirectUploadAuthRequest } from '@modules/chat-box/message-management/dto/request/request-direct-upload-auth.request';
import { SearchGlobalResultsQueryRequest } from '@modules/chat-box/message-management/dto/request/search-global-results-query.request';
import { SearchGlobalSuggestQueryRequest } from '@modules/chat-box/message-management/dto/request/search-global-suggest-query.request';
import { SearchRoomMessagesQueryRequest } from '@modules/chat-box/message-management/dto/request/search-room-messages-query.request';
import { SendMessageRequest } from '@modules/chat-box/message-management/dto/request/send-message.request';
import { UpdateScheduledMessageRequest } from '@modules/chat-box/message-management/dto/request/update-scheduled-message.request';
import { UpdateMessageRequest } from '@modules/chat-box/message-management/dto/request/update-message.request';
import { UpdateReadStateRequest } from '@modules/chat-box/message-management/dto/request/update-read-state.request';
import { UpsertCurrentDraftRequest } from '@modules/chat-box/message-management/dto/request/upsert-current-draft.request';
import { UploadMessageAttachmentRequest } from '@modules/chat-box/message-management/dto/request/upload-message-attachment.request';
import { ChatDraftListResponse } from '@modules/chat-box/message-management/dto/response/chat-draft-list.response';
import { ChatDraftResponse } from '@modules/chat-box/message-management/dto/response/chat-draft.response';
import { DeleteDraftResponse } from '@modules/chat-box/message-management/dto/response/delete-draft.response';
import { DeleteScheduledMessageResponse } from '@modules/chat-box/message-management/dto/response/delete-scheduled-message.response';
import { DirectUploadAuthResponse } from '@modules/chat-box/message-management/dto/response/direct-upload-auth.response';
import { ForwardMessageResponse } from '@modules/chat-box/message-management/dto/response/forward-message.response';
import { ListRoomMessagesCursorResponse } from '@modules/chat-box/message-management/dto/response/list-room-messages-cursor.response';
import { MarkMyMentionsReadResponse } from '@modules/chat-box/message-management/dto/response/mark-my-mentions-read.response';
import { MentionResponse } from '@modules/chat-box/message-management/dto/response/mention.response';
import { MessageAttachmentResponse } from '@modules/chat-box/message-management/dto/response/message-attachment.response';
import { MessageLinkPreviewResponse } from '@modules/chat-box/message-management/dto/response/message-link-preview.response';
import { MessageReactionSummaryResponse } from '@modules/chat-box/message-management/dto/response/message-reaction-summary.response';
import { MessageReactionsByMessageResponse } from '@modules/chat-box/message-management/dto/response/message-reactions-by-message.response';
import { PersonalInboxRoomReadResponse } from '@modules/chat-box/message-management/dto/response/personal-inbox-room-read.response';
import { PinnedMessageResponse } from '@modules/chat-box/message-management/dto/response/pinned-message.response';
import { ReadStateResponse } from '@modules/chat-box/message-management/dto/response/read-state.response';
import { RoomAttachmentItemResponse } from '@modules/chat-box/message-management/dto/response/room-attachment-item.response';
import { RoomMessageContextResponse } from '@modules/chat-box/message-management/dto/response/room-message-context.response';
import { RoomMessageResponse } from '@modules/chat-box/message-management/dto/response/room-message.response';
import { ScheduledMessageCancelToDraftResponse } from '@modules/chat-box/message-management/dto/response/scheduled-message-cancel-to-draft.response';
import { ScheduledMessageListResponse } from '@modules/chat-box/message-management/dto/response/scheduled-message-list.response';
import { ScheduledMessageResponse } from '@modules/chat-box/message-management/dto/response/scheduled-message.response';
import { ScheduledMessageSendNowResponse } from '@modules/chat-box/message-management/dto/response/scheduled-message-send-now.response';
import { SearchGlobalResultsResponse } from '@modules/chat-box/message-management/dto/response/search-global-results.response';
import { SearchGlobalSuggestResponse } from '@modules/chat-box/message-management/dto/response/search-global-suggest.response';
import { SearchRoomMessagesResponse } from '@modules/chat-box/message-management/dto/response/search-room-messages.response';
import { UnreadSummaryResponse } from '@modules/chat-box/message-management/dto/response/unread-summary.response';
import { UpdateMentionReadResponse } from '@modules/chat-box/message-management/dto/response/update-mention-read.response';
import { UpdateMessagePinResponse } from '@modules/chat-box/message-management/dto/response/update-message-pin.response';
import { UpdateMessageReactionResponse } from '@modules/chat-box/message-management/dto/response/update-message-reaction.response';
import { UpsertCurrentDraftResponse } from '@modules/chat-box/message-management/dto/response/upsert-current-draft.response';
import { MessageManagementService } from '@modules/chat-box/message-management/message-management.service';
import { PERMISSIONS } from '@modules/rbac/constant/permission.constant';
import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiHeader,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
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
export class MessageManagementController {
  constructor(
    private readonly messageManagementService: MessageManagementService,
  ) {}

  @Get('link-previews/google-assets/:fileId/image')
  @RequirePermission(PERMISSIONS.CHAT.MESSAGES.VIEW)
  @ApiParam({
    name: 'fileId',
    description: 'Google file ID extracted from docs/drive URL',
    type: String,
  })
  @ApiOperationAuto(
    'Lay preview image cho Google Docs/Sheets/Slides qua BE proxy',
    'Backend fetch/proxy thumbnail va tra ve asset noi bo de tranh phu thuoc session cookie Google tren FE.',
  )
  async getGoogleLinkPreviewImage(
    @Param('fileId') fileId: string,
    @Query('sz') size: string | undefined,
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const asset = await this.messageManagementService.getGoogleThumbnailAsset({
      fileId,
      size,
      ifNoneMatch,
    });

    res.setHeader('etag', asset.etag);
    res.setHeader('cache-control', asset.cacheControl);
    res.setHeader('x-preview-asset-status', asset.assetStatus);
    res.setHeader('x-preview-asset-source', asset.assetSource);

    if (asset.notModified) {
      res.status(304).send();
      return;
    }

    res.setHeader('content-type', asset.contentType || 'image/jpeg');
    res.status(200).send(asset.body);
  }

  @Get('messages/link-preview')
  @RequirePermission(PERMISSIONS.CHAT.MESSAGES.VIEW)
  @ApiOperationAuto(
    'Resolve internal message link preview',
    'Resolve permission-aware metadata for internal team-chat message link by roomId + messageId.',
  )
  async getMessageLinkPreview(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Query() query: GetMessageLinkPreviewQueryRequest,
  ): Promise<ApiResponseDto<MessageLinkPreviewResponse>> {
    const data = await this.messageManagementService.getMessageLinkPreview(
      organizationId,
      userId,
      query,
    );
    return new ApiResponseDto(
      200,
      'Resolved message link preview successfully',
      data,
    );
  }

  @Get('search/suggest')
  @RequirePermission(PERMISSIONS.CHAT.MESSAGES.VIEW)
  @ApiOperationAuto(
    'Global search suggest',
    'Return lightweight grouped search suggestions for header dropdown (people, rooms, messages, files).',
  )
  async searchGlobalSuggest(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Query() query: SearchGlobalSuggestQueryRequest,
  ): Promise<ApiResponseDto<SearchGlobalSuggestResponse>> {
    const data = await this.messageManagementService.searchGlobalSuggest(
      organizationId,
      userId,
      query,
    );
    return new ApiResponseDto(
      200,
      'Fetched global search suggestions successfully',
      data,
    );
  }

  @Get('search/results')
  @RequirePermission(PERMISSIONS.CHAT.MESSAGES.VIEW)
  @ApiOperationAuto(
    'Global search full results',
    'Return full search results for selected tab with counts, filters, and cursor support.',
  )
  async searchGlobalResults(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Query() query: SearchGlobalResultsQueryRequest,
  ): Promise<ApiResponseDto<SearchGlobalResultsResponse>> {
    const data = await this.messageManagementService.searchGlobalResults(
      organizationId,
      userId,
      query,
    );
    return new ApiResponseDto(
      200,
      'Fetched global search results successfully',
      data,
    );
  }

  @Get('rooms/:roomId/messages/:messageId/context')
  @RequirePermission(PERMISSIONS.CHAT.MESSAGES.VIEW)
  @ApiParam({ name: 'roomId', description: 'UUID room', type: String })
  @ApiParam({
    name: 'messageId',
    description: 'UUID target message for context window',
    type: String,
  })
  @ApiOperationAuto(
    'Resolve message context around target message',
    'Return a permission-aware context window around one target message for fast jump without cursor loop.',
  )
  async getRoomMessageContext(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Query() query: GetRoomMessageContextQueryRequest,
  ): Promise<ApiResponseDto<RoomMessageContextResponse>> {
    const data = await this.messageManagementService.getRoomMessageContext(
      organizationId,
      roomId,
      messageId,
      userId,
      query,
    );
    return new ApiResponseDto(
      200,
      'Resolved message context successfully',
      data,
    );
  }

  @Post('rooms/:roomId/messages')
  @RequirePermission(PERMISSIONS.CHAT.MESSAGES.CREATE)
  @ApiParam({ name: 'roomId', description: 'UUID room', type: String })
  @ApiOperationAuto(
    'Gửi message',
    'Tạo message mới trong room. Bỏ parentMessageId khi gửi message gốc. ' +
      'Dùng parentMessageId với messageId đã tồn tại trong cùng room để reply/thread. ' +
      'clientMessageId do client tự tạo để chống gửi trùng khi retry. ' +
      'mentionedUserIds là tùy chọn và truyền qua metadata.mentionedUserIds (mảng UUID user trong cùng room). ' +
      'Nếu truyền sai format UUID hoặc user không active trong room thì trả 400. Không cần mention thì có thể bỏ hoàn toàn field này.',
  )
  async sendMessage(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() dto: SendMessageRequest,
  ): Promise<ApiResponseDto<RoomMessageResponse>> {
    const data = await this.messageManagementService.sendMessage(
      organizationId,
      roomId,
      userId,
      dto,
    );
    return new ApiResponseDto(201, 'Message sent successfully', data);
  }

  @Put('rooms/:roomId/drafts/current')
  @RequirePermission(PERMISSIONS.CHAT.MESSAGES.CREATE)
  @ApiParam({ name: 'roomId', description: 'UUID room', type: String })
  @ApiOperationAuto(
    'Upsert draft hien tai',
    'Tu dong luu hoac cap nhat draft theo composer context hien tai. Neu payload rong thi xoa draft dang co.',
  )
  async upsertCurrentDraft(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() dto: UpsertCurrentDraftRequest,
  ): Promise<ApiResponseDto<UpsertCurrentDraftResponse>> {
    const data = await this.messageManagementService.upsertCurrentDraft(
      organizationId,
      roomId,
      userId,
      dto,
    );
    const message = data.draftDeleted
      ? 'Draft removed successfully'
      : 'Draft saved successfully';
    return new ApiResponseDto(200, message, data);
  }

  @Get('rooms/:roomId/drafts/current')
  @RequirePermission(PERMISSIONS.CHAT.MESSAGES.VIEW)
  @ApiParam({ name: 'roomId', description: 'UUID room', type: String })
  @ApiOperationAuto(
    'Lay draft hien tai',
    'Lay draft moi nhat cua user hien tai trong room/thread composer context.',
  )
  async getCurrentDraft(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Query() query: GetCurrentDraftQueryRequest,
  ): Promise<ApiResponseDto<ChatDraftResponse | null>> {
    const data = await this.messageManagementService.getCurrentDraft(
      organizationId,
      roomId,
      userId,
      query,
    );
    return new ApiResponseDto(200, 'Fetched current draft successfully', data);
  }

  @Get('drafts')
  @RequirePermission(PERMISSIONS.CHAT.MESSAGES.VIEW)
  @ApiOperationAuto(
    'Liet ke drafts cua toi',
    'Liet ke toan bo draft private cua user hien tai trong organization hien tai.',
  )
  async listMyDrafts(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Query() query: ListMyDraftsQueryRequest,
  ): Promise<ApiResponseDto<ChatDraftListResponse>> {
    const data = await this.messageManagementService.listMyDrafts(
      organizationId,
      userId,
      query,
    );
    return new ApiResponseDto(200, 'Fetched drafts successfully', data);
  }

  @Delete('drafts/:draftId')
  @RequirePermission(PERMISSIONS.CHAT.MESSAGES.CREATE)
  @ApiParam({ name: 'draftId', description: 'UUID draft can xoa', type: String })
  @ApiOperationAuto('Xoa draft', 'Xoa mot draft private theo id.')
  async deleteDraft(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Param('draftId', ParseUUIDPipe) draftId: string,
  ): Promise<ApiResponseDto<DeleteDraftResponse>> {
    const data = await this.messageManagementService.deleteDraft(
      organizationId,
      draftId,
      userId,
    );
    const message = data.deleted
      ? 'Draft deleted successfully'
      : 'No draft change: draft is already removed';
    return new ApiResponseDto(200, message, data);
  }

  @Post('rooms/:roomId/scheduled-messages')
  @RequirePermission(PERMISSIONS.CHAT.MESSAGES.CREATE)
  @ApiParam({ name: 'roomId', description: 'UUID room', type: String })
  @ApiOperationAuto(
    'Tao scheduled message',
    'Tao mot message dat lich gui trong room/thread context duoc chon.',
  )
  async createScheduledMessage(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() dto: CreateScheduledMessageRequest,
  ): Promise<ApiResponseDto<ScheduledMessageResponse>> {
    const data = await this.messageManagementService.createScheduledMessage(
      organizationId,
      roomId,
      userId,
      dto,
    );
    return new ApiResponseDto(201, 'Scheduled message created successfully', data);
  }

  @Get('scheduled-messages')
  @RequirePermission(PERMISSIONS.CHAT.MESSAGES.VIEW)
  @ApiOperationAuto(
    'Liet ke scheduled messages cua toi',
    'Liet ke cac scheduled outgoing message private cua user hien tai.',
  )
  async listMyScheduledMessages(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Query() query: ListMyScheduledMessagesQueryRequest,
  ): Promise<ApiResponseDto<ScheduledMessageListResponse>> {
    const data = await this.messageManagementService.listMyScheduledMessages(
      organizationId,
      userId,
      query,
    );
    return new ApiResponseDto(200, 'Fetched scheduled messages successfully', data);
  }

  @Put('scheduled-messages/:scheduledMessageId')
  @RequirePermission(PERMISSIONS.CHAT.MESSAGES.CREATE)
  @ApiParam({
    name: 'scheduledMessageId',
    description: 'UUID scheduled message can cap nhat',
    type: String,
  })
  @ApiOperationAuto(
    'Cap nhat scheduled message',
    'Cap nhat content/metadata/thoi gian cua scheduled message truoc khi den gio gui.',
  )
  async updateScheduledMessage(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Param('scheduledMessageId', ParseUUIDPipe) scheduledMessageId: string,
    @Body() dto: UpdateScheduledMessageRequest,
  ): Promise<ApiResponseDto<ScheduledMessageResponse>> {
    const data = await this.messageManagementService.updateScheduledMessage(
      organizationId,
      scheduledMessageId,
      userId,
      dto,
    );
    return new ApiResponseDto(200, 'Scheduled message updated successfully', data);
  }

  @Put('scheduled-messages/:scheduledMessageId/cancel-to-draft')
  @RequirePermission(PERMISSIONS.CHAT.MESSAGES.CREATE)
  @ApiParam({
    name: 'scheduledMessageId',
    description: 'UUID scheduled message can cancel',
    type: String,
  })
  @ApiOperationAuto(
    'Cancel schedule va luu vao draft',
    'Huy mot lich pending va luu payload tro lai draft private.',
  )
  async cancelScheduledMessageToDraft(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Param('scheduledMessageId', ParseUUIDPipe) scheduledMessageId: string,
  ): Promise<ApiResponseDto<ScheduledMessageCancelToDraftResponse>> {
    const data = await this.messageManagementService.cancelScheduledMessageToDraft(
      organizationId,
      scheduledMessageId,
      userId,
    );
    return new ApiResponseDto(
      200,
      'Scheduled message cancelled and saved to draft successfully',
      data,
    );
  }

  @Put('scheduled-messages/:scheduledMessageId/send-now')
  @RequirePermission(PERMISSIONS.CHAT.MESSAGES.CREATE)
  @ApiParam({
    name: 'scheduledMessageId',
    description: 'UUID scheduled message can gui ngay',
    type: String,
  })
  @ApiOperationAuto(
    'Gui ngay scheduled message',
    'Gui ngay mot scheduled message dang pending/failed.',
  )
  async sendScheduledMessageNow(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Param('scheduledMessageId', ParseUUIDPipe) scheduledMessageId: string,
  ): Promise<ApiResponseDto<ScheduledMessageSendNowResponse>> {
    const data = await this.messageManagementService.sendScheduledMessageNow(
      organizationId,
      scheduledMessageId,
      userId,
    );
    return new ApiResponseDto(200, 'Scheduled message sent successfully', data);
  }

  @Delete('scheduled-messages/:scheduledMessageId')
  @RequirePermission(PERMISSIONS.CHAT.MESSAGES.CREATE)
  @ApiParam({
    name: 'scheduledMessageId',
    description: 'UUID scheduled message can xoa',
    type: String,
  })
  @ApiOperationAuto(
    'Xoa scheduled message',
    'Xoa mot scheduled message truoc khi message duoc gui.',
  )
  async deleteScheduledMessage(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Param('scheduledMessageId', ParseUUIDPipe) scheduledMessageId: string,
  ): Promise<ApiResponseDto<DeleteScheduledMessageResponse>> {
    const data = await this.messageManagementService.deleteScheduledMessage(
      organizationId,
      scheduledMessageId,
      userId,
    );
    const message = data.deleted
      ? 'Scheduled message deleted successfully'
      : 'No scheduled message change';
    return new ApiResponseDto(200, message, data);
  }

  @Post('rooms/:roomId/messages/:messageId/forward')
  @RequirePermission(PERMISSIONS.CHAT.MESSAGES.CREATE)
  @ApiParam({ name: 'roomId', description: 'UUID room nguon', type: String })
  @ApiParam({
    name: 'messageId',
    description: 'UUID message nguon can forward',
    type: String,
  })
  @ApiOperationAuto(
    'Forward message',
    'Forward mot message nguon den mot hoac nhieu room dich. Ho tro ca text va media/file (clone attachment metadata sang message moi). Backend xu ly theo target va tra ket qua tung target (thanh cong/that bai).',
  )
  async forwardMessage(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Body() dto: ForwardMessageRequest,
  ): Promise<ApiResponseDto<ForwardMessageResponse>> {
    const data = await this.messageManagementService.forwardMessage(
      organizationId,
      roomId,
      messageId,
      userId,
      dto,
    );
    const message =
      data.forwardedCount > 0
        ? 'Forward message processed successfully'
        : 'Forward message completed with no successful target';
    return new ApiResponseDto(200, message, data);
  }

  @Put('rooms/:roomId/messages/:messageId')
  @RequirePermission(PERMISSIONS.CHAT.MESSAGES.UPDATE)
  @ApiParam({ name: 'roomId', description: 'UUID room', type: String })
  @ApiParam({
    name: 'messageId',
    description: 'UUID message cần cập nhật',
    type: String,
  })
  @ApiOperationAuto(
    'Cập nhật message',
    'Cập nhật nội dung/metadata của message. Người gửi sửa message của mình; owner/admin có thể sửa để kiểm duyệt.',
  )
  async updateMessage(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Body() dto: UpdateMessageRequest,
  ): Promise<ApiResponseDto<RoomMessageResponse>> {
    const data = await this.messageManagementService.updateMessage(
      organizationId,
      roomId,
      messageId,
      userId,
      dto,
    );
    return new ApiResponseDto(
      200,
      'Message update processed successfully',
      data,
    );
  }

  @Delete('rooms/:roomId/messages/:messageId')
  @RequirePermission(PERMISSIONS.CHAT.MESSAGES.DELETE)
  @ApiParam({ name: 'roomId', description: 'UUID room', type: String })
  @ApiParam({
    name: 'messageId',
    description: 'UUID message cần xóa',
    type: String,
  })
  @ApiOperationAuto(
    'Xóa message',
    'Xóa mềm message. Người gửi xóa message của mình; owner/admin có thể xóa để kiểm duyệt.',
  )
  async deleteMessage(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
  ): Promise<ApiResponseDto<RoomMessageResponse>> {
    const data = await this.messageManagementService.deleteMessage(
      organizationId,
      roomId,
      messageId,
      userId,
    );
    return new ApiResponseDto(
      200,
      'Message delete processed successfully',
      data,
    );
  }

  @Post('rooms/:roomId/messages/:messageId/attachments')
  @RequirePermission(PERMISSIONS.CHAT.ATTACHMENTS.UPLOAD)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'roomId', description: 'UUID room', type: String })
  @ApiParam({
    name: 'messageId',
    description: 'UUID message cần đính kèm file',
    type: String,
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        attachmentType: {
          type: 'string',
          enum: ['file', 'image', 'video', 'audio'],
        },
        checksum: { type: 'string' },
        width: { type: 'number' },
        height: { type: 'number' },
        durationMs: { type: 'number' },
        fileName: { type: 'string' },
        clientUploadId: { type: 'string' },
      },
    },
  })
  @ApiOperationAuto(
    'Upload file đính kèm message',
    'Upload file lên ImageKit và lưu metadata vào chat.message_attachments. ' +
      'Chỉ người gửi hoặc owner/admin được đính kèm file cho message.',
  )
  async uploadMessageAttachment(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadMessageAttachmentRequest,
  ): Promise<ApiResponseDto<MessageAttachmentResponse>> {
    const data = await this.messageManagementService.uploadMessageAttachment(
      organizationId,
      roomId,
      messageId,
      userId,
      file,
      dto,
    );
    return new ApiResponseDto(
      201,
      'Message attachment uploaded successfully',
      data,
    );
  }

  @Post('rooms/:roomId/messages/:messageId/attachments/direct-upload/auth')
  @RequirePermission(PERMISSIONS.CHAT.ATTACHMENTS.UPLOAD)
  @ApiParam({ name: 'roomId', description: 'UUID room', type: String })
  @ApiParam({
    name: 'messageId',
    description: 'UUID message de gan attachment',
    type: String,
  })
  @ApiOperationAuto(
    'Lay auth cho direct upload',
    'Sinh token/signature/expire de FE upload truc tiep len ImageKit roi goi endpoint complete.',
  )
  async requestDirectUploadAuth(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Body() dto: RequestDirectUploadAuthRequest,
  ): Promise<ApiResponseDto<DirectUploadAuthResponse>> {
    const data = await this.messageManagementService.requestDirectUploadAuth(
      organizationId,
      roomId,
      messageId,
      userId,
      dto,
    );
    return new ApiResponseDto(
      200,
      'Direct upload auth generated successfully',
      data,
    );
  }

  @Put('rooms/:roomId/messages/:messageId/attachments/direct-upload/complete')
  @RequirePermission(PERMISSIONS.CHAT.ATTACHMENTS.UPLOAD)
  @ApiParam({ name: 'roomId', description: 'UUID room', type: String })
  @ApiParam({
    name: 'messageId',
    description: 'UUID message de gan attachment',
    type: String,
  })
  @ApiOperationAuto(
    'Complete direct upload attachment',
    'Sau khi FE upload file truc tiep len storage, goi API nay de persist metadata vao chat.message_attachments.',
  )
  async completeDirectUploadAttachment(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Body() dto: CompleteDirectUploadAttachmentRequest,
  ): Promise<ApiResponseDto<MessageAttachmentResponse>> {
    const data =
      await this.messageManagementService.completeDirectUploadAttachment(
        organizationId,
        roomId,
        messageId,
        userId,
        dto,
      );
    return new ApiResponseDto(
      201,
      'Direct upload attachment completed successfully',
      data,
    );
  }

  @Get('rooms/:roomId/messages/:messageId/attachments')
  @RequirePermission(PERMISSIONS.CHAT.ATTACHMENTS.LIST)
  @ApiParam({ name: 'roomId', description: 'UUID room', type: String })
  @ApiParam({ name: 'messageId', description: 'UUID message', type: String })
  @ApiOperationAuto(
    'Lấy danh sách file đính kèm của message',
    'Lấy toàn bộ metadata file đính kèm của một message theo thứ tự thời gian.',
  )
  async listMessageAttachments(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
  ): Promise<ApiResponseDto<MessageAttachmentResponse[]>> {
    const data = await this.messageManagementService.listMessageAttachments(
      organizationId,
      roomId,
      messageId,
      userId,
    );
    return new ApiResponseDto(
      200,
      'Fetched message attachments successfully',
      data,
    );
  }

  @Get('rooms/:roomId/attachments')
  @RequirePermission(PERMISSIONS.CHAT.ATTACHMENTS.LIST)
  @ApiParam({ name: 'roomId', description: 'UUID room', type: String })
  @ApiOperationAuto(
    'Liet ke attachment cua ca room',
    'Lay danh sach attachment theo toan bo lich su room. Ho tro loc theo type va search de map tab Files/Photos khong phu thuoc vao message local cache.',
  )
  async listRoomAttachments(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Query() query: ListRoomAttachmentsQueryRequest,
  ): Promise<ApiResponseDto<PaginatedResponse<RoomAttachmentItemResponse>>> {
    const data = await this.messageManagementService.listRoomAttachments(
      organizationId,
      roomId,
      userId,
      query,
    );
    return new ApiResponseDto(
      200,
      'Fetched room attachments successfully',
      data,
    );
  }

  @Delete('rooms/:roomId/messages/:messageId/attachments/:attachmentId')
  @RequirePermission(PERMISSIONS.CHAT.ATTACHMENTS.DELETE)
  @ApiParam({ name: 'roomId', description: 'UUID room', type: String })
  @ApiParam({ name: 'messageId', description: 'UUID message', type: String })
  @ApiParam({
    name: 'attachmentId',
    description: 'UUID attachment',
    type: String,
  })
  @ApiOperationAuto(
    'Xóa file đính kèm của message',
    'Xóa metadata của một file đính kèm và cố gắng xóa file từ xa trên ImageKit. ' +
      'Chỉ người gửi hoặc owner/admin được xóa.',
  )
  async removeMessageAttachment(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
  ): Promise<ApiResponseDto<MessageAttachmentResponse>> {
    const data = await this.messageManagementService.removeMessageAttachment(
      organizationId,
      roomId,
      messageId,
      attachmentId,
      userId,
    );
    return new ApiResponseDto(
      200,
      'Message attachment removed successfully',
      data,
    );
  }

  @Get('rooms/:roomId/messages')
  @RequirePermission(PERMISSIONS.CHAT.MESSAGES.LIST)
  @ApiParam({ name: 'roomId', description: 'UUID room', type: String })
  @ApiOperationAuto(
    'Lấy message trong room',
    'Lấy danh sách message theo cursor đơn giản',
  )
  async listRoomMessages(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Query() query: ListRoomMessagesQueryRequest,
  ): Promise<ApiResponseDto<RoomMessageResponse[]>> {
    const data = await this.messageManagementService.listRoomMessages(
      organizationId,
      roomId,
      userId,
      query,
    );
    return new ApiResponseDto(200, 'Fetched room messages successfully', data);
  }

  @Get('rooms/:roomId/messages/cursor')
  @RequirePermission(PERMISSIONS.CHAT.MESSAGES.LIST)
  @ApiParam({ name: 'roomId', description: 'UUID room', type: String })
  @ApiOperationAuto(
    'Lay message theo keyset cursor',
    'Ho tro lazy-load on dinh cho room lon. Cursor la base64url JSON gom sentAt + id.',
  )
  async listRoomMessagesByCursor(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Query() query: ListRoomMessagesCursorQueryRequest,
  ): Promise<ApiResponseDto<ListRoomMessagesCursorResponse>> {
    const data = await this.messageManagementService.listRoomMessagesByCursor(
      organizationId,
      roomId,
      userId,
      query,
    );
    return new ApiResponseDto(
      200,
      'Fetched room messages by cursor successfully',
      data,
    );
  }

  @Get('rooms/:roomId/messages/search')
  @RequirePermission(PERMISSIONS.CHAT.MESSAGES.VIEW)
  @ApiParam({ name: 'roomId', description: 'UUID room', type: String })
  @ApiOperationAuto(
    'Tim message trong room',
    'Tim theo full text trong lich su room. Ho tro cursor de FE phan trang ket qua tim kiem.',
  )
  async searchRoomMessages(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Query() query: SearchRoomMessagesQueryRequest,
  ): Promise<ApiResponseDto<SearchRoomMessagesResponse>> {
    const data = await this.messageManagementService.searchRoomMessages(
      organizationId,
      roomId,
      userId,
      query,
    );
    return new ApiResponseDto(200, 'Searched room messages successfully', data);
  }

  @Put('rooms/:roomId/read-state')
  @RequirePermission(PERMISSIONS.CHAT.MESSAGES.VIEW)
  @ApiParam({ name: 'roomId', description: 'UUID room', type: String })
  @ApiOperationAuto(
    'Cập nhật read-state',
    'Cập nhật read-state của tôi cho room và trả về unread count sau khi đánh dấu đã đọc.',
  )
  async updateMyReadState(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() dto: UpdateReadStateRequest,
  ): Promise<ApiResponseDto<ReadStateResponse>> {
    const data = await this.messageManagementService.updateMyReadState(
      organizationId,
      roomId,
      userId,
      dto,
    );
    return new ApiResponseDto(200, 'Read state updated successfully', data);
  }

  @Put('personal-inbox/rooms/:roomId/read')
  @RequirePermission(PERMISSIONS.CHAT.MESSAGES.VIEW)
  @ApiParam({ name: 'roomId', description: 'UUID room', type: String })
  @ApiOperationAuto(
    'Danh dau personal inbox theo room da doc',
    'Hop nhat mark read cho mentions va notifications cua user hien tai trong mot room bang mot request duy nhat.',
  )
  async markPersonalInboxRoomAsRead(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() dto: MarkPersonalInboxRoomReadRequest,
  ): Promise<ApiResponseDto<PersonalInboxRoomReadResponse>> {
    const data = await this.messageManagementService.markPersonalInboxRoomAsRead(
      organizationId,
      roomId,
      userId,
      dto ?? {},
    );
    const message = data.updated
      ? 'Personal inbox room marked as read successfully'
      : 'No personal inbox change: there are no unread personal inbox items in this room';
    return new ApiResponseDto(200, message, data);
  }

  @Get('read-states/unread-counts')
  @RequirePermission(PERMISSIONS.CHAT.MESSAGES.LIST)
  @ApiOperationAuto(
    'Lấy unread count',
    'Lấy unread count theo từng room đã tham gia của user hiện tại (không tính message do tôi gửi).',
  )
  async listMyUnreadCounts(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
  ): Promise<ApiResponseDto<UnreadSummaryResponse>> {
    const data = await this.messageManagementService.listMyUnreadCounts(
      organizationId,
      userId,
    );
    return new ApiResponseDto(200, 'Fetched unread counts successfully', data);
  }

  @Get('rooms/:roomId/messages/reactions')
  @RequirePermission(PERMISSIONS.CHAT.MESSAGES.VIEW)
  @ApiParam({ name: 'roomId', description: 'UUID room', type: String })
  @ApiOperationAuto(
    'Lay reaction summaries theo nhieu message ids',
    'API batch de FE hydrate reactions cho nhieu message cung luc, tranh fan-out request theo tung message.',
  )
  async listMessageReactionsByMessageIds(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Query() query: ListMessageReactionsBatchQueryRequest,
  ): Promise<ApiResponseDto<MessageReactionsByMessageResponse[]>> {
    const data =
      await this.messageManagementService.listMessageReactionsByMessageIds(
        organizationId,
        roomId,
        userId,
        query.messageIds,
      );
    return new ApiResponseDto(
      200,
      'Fetched message reactions by message ids successfully',
      data,
    );
  }

  @Post('rooms/:roomId/messages/:messageId/reactions')
  @RequirePermission(PERMISSIONS.CHAT.REACTIONS.ADD)
  @ApiParam({ name: 'roomId', description: 'UUID room', type: String })
  @ApiParam({ name: 'messageId', description: 'UUID message', type: String })
  @ApiOperationAuto(
    'Thêm reaction',
    'Thêm reaction cho message trong room. Cùng user + cùng emoji sẽ không tạo bản ghi trùng (idempotent).',
  )
  async addMessageReaction(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Body() dto: AddMessageReactionRequest,
  ): Promise<ApiResponseDto<UpdateMessageReactionResponse>> {
    const data = await this.messageManagementService.addMessageReaction(
      organizationId,
      roomId,
      messageId,
      userId,
      dto,
    );
    const message = data.updated
      ? 'Reaction added successfully'
      : 'No reaction change: this emoji was already added by current user';
    return new ApiResponseDto(200, message, data);
  }

  @Delete('rooms/:roomId/messages/:messageId/reactions')
  @RequirePermission(PERMISSIONS.CHAT.REACTIONS.REMOVE)
  @ApiParam({ name: 'roomId', description: 'UUID room', type: String })
  @ApiParam({ name: 'messageId', description: 'UUID message', type: String })
  @ApiOperationAuto(
    'Xóa reaction',
    'Xóa emoji reaction của tôi khỏi message trong room. Nếu reaction chưa tồn tại thì vẫn an toàn khi gọi lặp lại (idempotent).',
  )
  async removeMessageReaction(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Query() query: RemoveMessageReactionQueryRequest,
  ): Promise<ApiResponseDto<UpdateMessageReactionResponse>> {
    const data = await this.messageManagementService.removeMessageReaction(
      organizationId,
      roomId,
      messageId,
      userId,
      query,
    );
    const message = data.updated
      ? 'Reaction removed successfully'
      : 'No reaction change: current user has no matching reaction to remove';
    return new ApiResponseDto(200, message, data);
  }

  @Get('rooms/:roomId/messages/:messageId/reactions')
  @RequirePermission(PERMISSIONS.CHAT.MESSAGES.VIEW)
  @ApiParam({ name: 'roomId', description: 'UUID room', type: String })
  @ApiParam({ name: 'messageId', description: 'UUID message', type: String })
  @ApiOperationAuto(
    'Lấy danh sách reaction',
    'Lấy danh sách reaction tổng hợp của message (emoji, số lượng, tôi đã thả hay chưa) kèm reactors[] để FE render tooltip danh sách user đã thả.',
  )
  async listMessageReactions(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
  ): Promise<ApiResponseDto<MessageReactionSummaryResponse[]>> {
    const data = await this.messageManagementService.listMessageReactions(
      organizationId,
      roomId,
      messageId,
      userId,
    );
    return new ApiResponseDto(
      200,
      'Fetched message reactions successfully',
      data,
    );
  }

  @Post('rooms/:roomId/messages/:messageId/pin')
  @RequirePermission(PERMISSIONS.CHAT.PINS.ADD)
  @ApiParam({ name: 'roomId', description: 'UUID room', type: String })
  @ApiParam({
    name: 'messageId',
    description: 'UUID message cần pin',
    type: String,
  })
  @ApiOperationAuto(
    'Ghim message',
    'Ghim message trong room. Mặc định owner/admin được ghim; member/guest phụ thuộc chính sách room. Tối đa 10 message ghim đang active trong một room.',
  )
  async pinMessage(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
  ): Promise<ApiResponseDto<UpdateMessagePinResponse>> {
    const result = await this.messageManagementService.pinMessage(
      organizationId,
      roomId,
      messageId,
      userId,
    );
    const message = result.updated
      ? 'Message pinned successfully'
      : 'No pin change: this message is already pinned';
    return new ApiResponseDto(200, message, result);
  }

  @Delete('rooms/:roomId/messages/:messageId/pin')
  @RequirePermission(PERMISSIONS.CHAT.PINS.REMOVE)
  @ApiParam({ name: 'roomId', description: 'UUID room', type: String })
  @ApiParam({
    name: 'messageId',
    description: 'UUID message cần unpin',
    type: String,
  })
  @ApiOperationAuto(
    'Bỏ ghim message',
    'Bỏ ghim một message khỏi room. Nếu message chưa được ghim thì thao tác no-op (idempotent).',
  )
  async unpinMessage(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
  ): Promise<ApiResponseDto<UpdateMessagePinResponse>> {
    const result = await this.messageManagementService.unpinMessage(
      organizationId,
      roomId,
      messageId,
      userId,
    );
    const message = result.updated
      ? 'Message unpinned successfully'
      : 'No pin change: this message is not pinned';
    return new ApiResponseDto(200, message, result);
  }

  @Get('rooms/:roomId/pins')
  @RequirePermission(PERMISSIONS.CHAT.PINS.LIST)
  @ApiParam({ name: 'roomId', description: 'UUID room', type: String })
  @ApiOperationAuto(
    'Lấy danh sách message đã ghim',
    'Danh sách message đang được ghim trong room',
  )
  async listPinnedMessages(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
  ): Promise<ApiResponseDto<PinnedMessageResponse[]>> {
    const data = await this.messageManagementService.listPinnedMessages(
      organizationId,
      roomId,
      userId,
    );
    return new ApiResponseDto(
      200,
      'Fetched pinned messages successfully',
      data,
    );
  }

  @Get('mentions/me')
  @RequirePermission(PERMISSIONS.CHAT.MESSAGES.VIEW)
  @ApiOperationAuto(
    'Lấy danh sách mention của tôi',
    'Lấy các mention mà user hiện tại được tag trong organization hiện tại.',
  )
  async listMyMentions(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Query() query: ListMyMentionsQueryRequest,
  ): Promise<ApiResponseDto<MentionResponse[]>> {
    const data = await this.messageManagementService.listMyMentions(
      organizationId,
      userId,
      query,
    );
    return new ApiResponseDto(200, 'Fetched my mentions successfully', data);
  }

  @Put('mentions/me/read-all')
  @RequirePermission(PERMISSIONS.CHAT.MESSAGES.VIEW)
  @ApiOperationAuto(
    'Đánh dấu tất cả mentions đã đọc',
    'Đánh dấu đã đọc toàn bộ mentions của tôi trong organization hoặc trong room cụ thể nếu truyền roomId.',
  )
  async markMyMentionsAsRead(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Query() query: MarkMyMentionsReadRequest,
  ): Promise<ApiResponseDto<MarkMyMentionsReadResponse>> {
    const data = await this.messageManagementService.markMyMentionsAsRead(
      organizationId,
      userId,
      query,
    );
    const message =
      data.updatedCount > 0
        ? 'Mentions marked as read successfully'
        : 'No mention change: there are no unread mentions in selected scope';
    return new ApiResponseDto(200, message, data);
  }

  @Put('mentions/:mentionId/read')
  @RequirePermission(PERMISSIONS.CHAT.MESSAGES.VIEW)
  @ApiParam({ name: 'mentionId', description: 'UUID mention', type: String })
  @ApiOperationAuto(
    'Đánh dấu mention đã đọc',
    'Đánh dấu một mention là đã đọc cho user hiện tại',
  )
  async markMentionAsRead(
    @GetOrgId() organizationId: string,
    @GetUser('sub') userId: string,
    @Param('mentionId', ParseUUIDPipe) mentionId: string,
  ): Promise<ApiResponseDto<UpdateMentionReadResponse>> {
    const data = await this.messageManagementService.markMentionAsRead(
      organizationId,
      mentionId,
      userId,
    );
    const message = data.updated
      ? 'Mention marked as read successfully'
      : 'No mention change: mention is already marked as read';
    return new ApiResponseDto(200, message, data);
  }
}
