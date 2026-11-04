import { ChatBoxCoreService } from '@modules/chat-box/core/chat-box-core.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RoomManagementService {
  constructor(private readonly chatBoxCoreService: ChatBoxCoreService) {}

  async createRoom(
    ...args: Parameters<ChatBoxCoreService['createRoom']>
  ): ReturnType<ChatBoxCoreService['createRoom']> {
    return this.chatBoxCoreService.createRoom(...args);
  }

  async listMyRooms(
    ...args: Parameters<ChatBoxCoreService['listMyRooms']>
  ): ReturnType<ChatBoxCoreService['listMyRooms']> {
    return this.chatBoxCoreService.listMyRooms(...args);
  }

  async discoverPublicRooms(
    ...args: Parameters<ChatBoxCoreService['discoverPublicRooms']>
  ): ReturnType<ChatBoxCoreService['discoverPublicRooms']> {
    return this.chatBoxCoreService.discoverPublicRooms(...args);
  }

  async listCreateRoomCandidates(
    ...args: Parameters<ChatBoxCoreService['listCreateRoomCandidates']>
  ): ReturnType<ChatBoxCoreService['listCreateRoomCandidates']> {
    return this.chatBoxCoreService.listCreateRoomCandidates(...args);
  }

  async getRoomDetail(
    ...args: Parameters<ChatBoxCoreService['getRoomDetail']>
  ): ReturnType<ChatBoxCoreService['getRoomDetail']> {
    return this.chatBoxCoreService.getRoomDetail(...args);
  }

  async getRoomBootstrap(
    ...args: Parameters<ChatBoxCoreService['getRoomBootstrap']>
  ): ReturnType<ChatBoxCoreService['getRoomBootstrap']> {
    return this.chatBoxCoreService.getRoomBootstrap(...args);
  }

  async getRoomPreview(
    ...args: Parameters<ChatBoxCoreService['getRoomPreview']>
  ): ReturnType<ChatBoxCoreService['getRoomPreview']> {
    return this.chatBoxCoreService.getRoomPreview(...args);
  }

  async updateRoomInfo(
    ...args: Parameters<ChatBoxCoreService['updateRoomInfo']>
  ): ReturnType<ChatBoxCoreService['updateRoomInfo']> {
    return this.chatBoxCoreService.updateRoomInfo(...args);
  }

  async updateRoomVisibility(
    ...args: Parameters<ChatBoxCoreService['updateRoomVisibility']>
  ): ReturnType<ChatBoxCoreService['updateRoomVisibility']> {
    return this.chatBoxCoreService.updateRoomVisibility(...args);
  }

  async archiveRoom(
    ...args: Parameters<ChatBoxCoreService['archiveRoom']>
  ): ReturnType<ChatBoxCoreService['archiveRoom']> {
    return this.chatBoxCoreService.archiveRoom(...args);
  }

  async unarchiveRoom(
    ...args: Parameters<ChatBoxCoreService['unarchiveRoom']>
  ): ReturnType<ChatBoxCoreService['unarchiveRoom']> {
    return this.chatBoxCoreService.unarchiveRoom(...args);
  }

  async getRoomTabs(
    ...args: Parameters<ChatBoxCoreService['getRoomTabs']>
  ): ReturnType<ChatBoxCoreService['getRoomTabs']> {
    return this.chatBoxCoreService.getRoomTabs(...args);
  }

  async updateRoomTabs(
    ...args: Parameters<ChatBoxCoreService['updateRoomTabs']>
  ): ReturnType<ChatBoxCoreService['updateRoomTabs']> {
    return this.chatBoxCoreService.updateRoomTabs(...args);
  }

  async starRoom(
    ...args: Parameters<ChatBoxCoreService['starRoom']>
  ): ReturnType<ChatBoxCoreService['starRoom']> {
    return this.chatBoxCoreService.starRoom(...args);
  }

  async unstarRoom(
    ...args: Parameters<ChatBoxCoreService['unstarRoom']>
  ): ReturnType<ChatBoxCoreService['unstarRoom']> {
    return this.chatBoxCoreService.unstarRoom(...args);
  }

  async updateRoomPolicies(
    ...args: Parameters<ChatBoxCoreService['updateRoomPolicies']>
  ): ReturnType<ChatBoxCoreService['updateRoomPolicies']> {
    return this.chatBoxCoreService.updateRoomPolicies(...args);
  }

  async joinPublicRoom(
    ...args: Parameters<ChatBoxCoreService['joinPublicRoom']>
  ): ReturnType<ChatBoxCoreService['joinPublicRoom']> {
    return this.chatBoxCoreService.joinPublicRoom(...args);
  }

  async listInviteCandidates(
    ...args: Parameters<ChatBoxCoreService['listInviteCandidates']>
  ): ReturnType<ChatBoxCoreService['listInviteCandidates']> {
    return this.chatBoxCoreService.listInviteCandidates(...args);
  }

  async inviteMembers(
    ...args: Parameters<ChatBoxCoreService['inviteMembers']>
  ): ReturnType<ChatBoxCoreService['inviteMembers']> {
    return this.chatBoxCoreService.inviteMembers(...args);
  }

  async acceptInvitation(
    ...args: Parameters<ChatBoxCoreService['acceptInvitation']>
  ): ReturnType<ChatBoxCoreService['acceptInvitation']> {
    return this.chatBoxCoreService.acceptInvitation(...args);
  }

  async updateMemberRole(
    ...args: Parameters<ChatBoxCoreService['updateMemberRole']>
  ): ReturnType<ChatBoxCoreService['updateMemberRole']> {
    return this.chatBoxCoreService.updateMemberRole(...args);
  }

  async transferRoomOwnership(
    ...args: Parameters<ChatBoxCoreService['transferRoomOwnership']>
  ): ReturnType<ChatBoxCoreService['transferRoomOwnership']> {
    return this.chatBoxCoreService.transferRoomOwnership(...args);
  }

  async updateMyRoomNotifySettings(
    ...args: Parameters<ChatBoxCoreService['updateMyRoomNotifySettings']>
  ): ReturnType<ChatBoxCoreService['updateMyRoomNotifySettings']> {
    return this.chatBoxCoreService.updateMyRoomNotifySettings(...args);
  }

  async updateMyRoomVisibility(
    ...args: Parameters<ChatBoxCoreService['updateMyRoomVisibility']>
  ): ReturnType<ChatBoxCoreService['updateMyRoomVisibility']> {
    return this.chatBoxCoreService.updateMyRoomVisibility(...args);
  }

  async removeMember(
    ...args: Parameters<ChatBoxCoreService['removeMember']>
  ): ReturnType<ChatBoxCoreService['removeMember']> {
    return this.chatBoxCoreService.removeMember(...args);
  }
}
