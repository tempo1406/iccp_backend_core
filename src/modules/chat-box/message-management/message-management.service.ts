import { ChatBoxCoreService } from '@modules/chat-box/core/chat-box-core.service';
import { ChatLinkPreviewService } from '@modules/chat-box/link-preview/chat-link-preview.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MessageManagementService {
  constructor(
    private readonly chatBoxCoreService: ChatBoxCoreService,
    private readonly chatLinkPreviewService: ChatLinkPreviewService,
  ) {}

  async getGoogleThumbnailAsset(
    ...args: Parameters<ChatLinkPreviewService['getGoogleThumbnailAsset']>
  ): ReturnType<ChatLinkPreviewService['getGoogleThumbnailAsset']> {
    return this.chatLinkPreviewService.getGoogleThumbnailAsset(...args);
  }

  async sendMessage(
    ...args: Parameters<ChatBoxCoreService['sendMessage']>
  ): ReturnType<ChatBoxCoreService['sendMessage']> {
    return this.chatBoxCoreService.sendMessage(...args);
  }

  async getMessageLinkPreview(
    ...args: Parameters<ChatBoxCoreService['getMessageLinkPreview']>
  ): ReturnType<ChatBoxCoreService['getMessageLinkPreview']> {
    return this.chatBoxCoreService.getMessageLinkPreview(...args);
  }

  async getRoomMessageContext(
    ...args: Parameters<ChatBoxCoreService['getRoomMessageContext']>
  ): ReturnType<ChatBoxCoreService['getRoomMessageContext']> {
    return this.chatBoxCoreService.getRoomMessageContext(...args);
  }

  async forwardMessage(
    ...args: Parameters<ChatBoxCoreService['forwardMessage']>
  ): ReturnType<ChatBoxCoreService['forwardMessage']> {
    return this.chatBoxCoreService.forwardMessage(...args);
  }

  async updateMessage(
    ...args: Parameters<ChatBoxCoreService['updateMessage']>
  ): ReturnType<ChatBoxCoreService['updateMessage']> {
    return this.chatBoxCoreService.updateMessage(...args);
  }

  async deleteMessage(
    ...args: Parameters<ChatBoxCoreService['deleteMessage']>
  ): ReturnType<ChatBoxCoreService['deleteMessage']> {
    return this.chatBoxCoreService.deleteMessage(...args);
  }

  async uploadMessageAttachment(
    ...args: Parameters<ChatBoxCoreService['uploadMessageAttachment']>
  ): ReturnType<ChatBoxCoreService['uploadMessageAttachment']> {
    return this.chatBoxCoreService.uploadMessageAttachment(...args);
  }

  async requestDirectUploadAuth(
    ...args: Parameters<ChatBoxCoreService['requestDirectUploadAuth']>
  ): ReturnType<ChatBoxCoreService['requestDirectUploadAuth']> {
    return this.chatBoxCoreService.requestDirectUploadAuth(...args);
  }

  async completeDirectUploadAttachment(
    ...args: Parameters<ChatBoxCoreService['completeDirectUploadAttachment']>
  ): ReturnType<ChatBoxCoreService['completeDirectUploadAttachment']> {
    return this.chatBoxCoreService.completeDirectUploadAttachment(...args);
  }

  async listMessageAttachments(
    ...args: Parameters<ChatBoxCoreService['listMessageAttachments']>
  ): ReturnType<ChatBoxCoreService['listMessageAttachments']> {
    return this.chatBoxCoreService.listMessageAttachments(...args);
  }

  async listRoomAttachments(
    ...args: Parameters<ChatBoxCoreService['listRoomAttachments']>
  ): ReturnType<ChatBoxCoreService['listRoomAttachments']> {
    return this.chatBoxCoreService.listRoomAttachments(...args);
  }

  async removeMessageAttachment(
    ...args: Parameters<ChatBoxCoreService['removeMessageAttachment']>
  ): ReturnType<ChatBoxCoreService['removeMessageAttachment']> {
    return this.chatBoxCoreService.removeMessageAttachment(...args);
  }

  async listRoomMessages(
    ...args: Parameters<ChatBoxCoreService['listRoomMessages']>
  ): ReturnType<ChatBoxCoreService['listRoomMessages']> {
    return this.chatBoxCoreService.listRoomMessages(...args);
  }

  async listRoomMessagesByCursor(
    ...args: Parameters<ChatBoxCoreService['listRoomMessagesByCursor']>
  ): ReturnType<ChatBoxCoreService['listRoomMessagesByCursor']> {
    return this.chatBoxCoreService.listRoomMessagesByCursor(...args);
  }

  async searchRoomMessages(
    ...args: Parameters<ChatBoxCoreService['searchRoomMessages']>
  ): ReturnType<ChatBoxCoreService['searchRoomMessages']> {
    return this.chatBoxCoreService.searchRoomMessages(...args);
  }

  async searchGlobalSuggest(
    ...args: Parameters<ChatBoxCoreService['searchGlobalSuggest']>
  ): ReturnType<ChatBoxCoreService['searchGlobalSuggest']> {
    return this.chatBoxCoreService.searchGlobalSuggest(...args);
  }

  async searchGlobalResults(
    ...args: Parameters<ChatBoxCoreService['searchGlobalResults']>
  ): ReturnType<ChatBoxCoreService['searchGlobalResults']> {
    return this.chatBoxCoreService.searchGlobalResults(...args);
  }

  async updateMyReadState(
    ...args: Parameters<ChatBoxCoreService['updateMyReadState']>
  ): ReturnType<ChatBoxCoreService['updateMyReadState']> {
    return this.chatBoxCoreService.updateMyReadState(...args);
  }

  async listMyUnreadCounts(
    ...args: Parameters<ChatBoxCoreService['listMyUnreadCounts']>
  ): ReturnType<ChatBoxCoreService['listMyUnreadCounts']> {
    return this.chatBoxCoreService.listMyUnreadCounts(...args);
  }

  async addMessageReaction(
    ...args: Parameters<ChatBoxCoreService['addMessageReaction']>
  ): ReturnType<ChatBoxCoreService['addMessageReaction']> {
    return this.chatBoxCoreService.addMessageReaction(...args);
  }

  async removeMessageReaction(
    ...args: Parameters<ChatBoxCoreService['removeMessageReaction']>
  ): ReturnType<ChatBoxCoreService['removeMessageReaction']> {
    return this.chatBoxCoreService.removeMessageReaction(...args);
  }

  async listMessageReactions(
    ...args: Parameters<ChatBoxCoreService['listMessageReactions']>
  ): ReturnType<ChatBoxCoreService['listMessageReactions']> {
    return this.chatBoxCoreService.listMessageReactions(...args);
  }

  async listMessageReactionsByMessageIds(
    ...args: Parameters<ChatBoxCoreService['listMessageReactionsByMessageIds']>
  ): ReturnType<ChatBoxCoreService['listMessageReactionsByMessageIds']> {
    return this.chatBoxCoreService.listMessageReactionsByMessageIds(...args);
  }

  async pinMessage(
    ...args: Parameters<ChatBoxCoreService['pinMessage']>
  ): ReturnType<ChatBoxCoreService['pinMessage']> {
    return this.chatBoxCoreService.pinMessage(...args);
  }

  async unpinMessage(
    ...args: Parameters<ChatBoxCoreService['unpinMessage']>
  ): ReturnType<ChatBoxCoreService['unpinMessage']> {
    return this.chatBoxCoreService.unpinMessage(...args);
  }

  async listPinnedMessages(
    ...args: Parameters<ChatBoxCoreService['listPinnedMessages']>
  ): ReturnType<ChatBoxCoreService['listPinnedMessages']> {
    return this.chatBoxCoreService.listPinnedMessages(...args);
  }

  async listMyMentions(
    ...args: Parameters<ChatBoxCoreService['listMyMentions']>
  ): ReturnType<ChatBoxCoreService['listMyMentions']> {
    return this.chatBoxCoreService.listMyMentions(...args);
  }

  async markMyMentionsAsRead(
    ...args: Parameters<ChatBoxCoreService['markMyMentionsAsRead']>
  ): ReturnType<ChatBoxCoreService['markMyMentionsAsRead']> {
    return this.chatBoxCoreService.markMyMentionsAsRead(...args);
  }

  async markPersonalInboxRoomAsRead(
    ...args: Parameters<ChatBoxCoreService['markPersonalInboxRoomAsRead']>
  ): ReturnType<ChatBoxCoreService['markPersonalInboxRoomAsRead']> {
    return this.chatBoxCoreService.markPersonalInboxRoomAsRead(...args);
  }

  async markMentionAsRead(
    ...args: Parameters<ChatBoxCoreService['markMentionAsRead']>
  ): ReturnType<ChatBoxCoreService['markMentionAsRead']> {
    return this.chatBoxCoreService.markMentionAsRead(...args);
  }

  async upsertCurrentDraft(
    ...args: Parameters<ChatBoxCoreService['upsertCurrentDraft']>
  ): ReturnType<ChatBoxCoreService['upsertCurrentDraft']> {
    return this.chatBoxCoreService.upsertCurrentDraft(...args);
  }

  async getCurrentDraft(
    ...args: Parameters<ChatBoxCoreService['getCurrentDraft']>
  ): ReturnType<ChatBoxCoreService['getCurrentDraft']> {
    return this.chatBoxCoreService.getCurrentDraft(...args);
  }

  async listMyDrafts(
    ...args: Parameters<ChatBoxCoreService['listMyDrafts']>
  ): ReturnType<ChatBoxCoreService['listMyDrafts']> {
    return this.chatBoxCoreService.listMyDrafts(...args);
  }

  async deleteDraft(
    ...args: Parameters<ChatBoxCoreService['deleteDraft']>
  ): ReturnType<ChatBoxCoreService['deleteDraft']> {
    return this.chatBoxCoreService.deleteDraft(...args);
  }

  async createScheduledMessage(
    ...args: Parameters<ChatBoxCoreService['createScheduledMessage']>
  ): ReturnType<ChatBoxCoreService['createScheduledMessage']> {
    return this.chatBoxCoreService.createScheduledMessage(...args);
  }

  async listMyScheduledMessages(
    ...args: Parameters<ChatBoxCoreService['listMyScheduledMessages']>
  ): ReturnType<ChatBoxCoreService['listMyScheduledMessages']> {
    return this.chatBoxCoreService.listMyScheduledMessages(...args);
  }

  async updateScheduledMessage(
    ...args: Parameters<ChatBoxCoreService['updateScheduledMessage']>
  ): ReturnType<ChatBoxCoreService['updateScheduledMessage']> {
    return this.chatBoxCoreService.updateScheduledMessage(...args);
  }

  async cancelScheduledMessageToDraft(
    ...args: Parameters<ChatBoxCoreService['cancelScheduledMessageToDraft']>
  ): ReturnType<ChatBoxCoreService['cancelScheduledMessageToDraft']> {
    return this.chatBoxCoreService.cancelScheduledMessageToDraft(...args);
  }

  async sendScheduledMessageNow(
    ...args: Parameters<ChatBoxCoreService['sendScheduledMessageNow']>
  ): ReturnType<ChatBoxCoreService['sendScheduledMessageNow']> {
    return this.chatBoxCoreService.sendScheduledMessageNow(...args);
  }

  async deleteScheduledMessage(
    ...args: Parameters<ChatBoxCoreService['deleteScheduledMessage']>
  ): ReturnType<ChatBoxCoreService['deleteScheduledMessage']> {
    return this.chatBoxCoreService.deleteScheduledMessage(...args);
  }
}
