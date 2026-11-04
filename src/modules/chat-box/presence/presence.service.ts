import { ChatBoxCoreService } from '@modules/chat-box/core/chat-box-core.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PresenceService {
  constructor(private readonly chatBoxCoreService: ChatBoxCoreService) {}

  async updateMyPresence(
    ...args: Parameters<ChatBoxCoreService['updateMyPresence']>
  ): ReturnType<ChatBoxCoreService['updateMyPresence']> {
    return this.chatBoxCoreService.updateMyPresence(...args);
  }

  async listOrganizationPresence(
    ...args: Parameters<ChatBoxCoreService['listOrganizationPresence']>
  ): ReturnType<ChatBoxCoreService['listOrganizationPresence']> {
    return this.chatBoxCoreService.listOrganizationPresence(...args);
  }

  async handleSocketConnected(
    ...args: Parameters<ChatBoxCoreService['handleSocketConnected']>
  ): ReturnType<ChatBoxCoreService['handleSocketConnected']> {
    return this.chatBoxCoreService.handleSocketConnected(...args);
  }

  async handleSocketDisconnected(
    ...args: Parameters<ChatBoxCoreService['handleSocketDisconnected']>
  ): ReturnType<ChatBoxCoreService['handleSocketDisconnected']> {
    return this.chatBoxCoreService.handleSocketDisconnected(...args);
  }
}
