import { ChatBoxCoreModule } from '@modules/chat-box/core/chat-box-core.module';
import { RbacModule } from '@modules/rbac/rbac.module';
import { Module } from '@nestjs/common';
import { RoomManagementController } from './room-management.controller';
import { RoomManagementService } from './room-management.service';

@Module({
  imports: [ChatBoxCoreModule, RbacModule],
  controllers: [RoomManagementController],
  providers: [RoomManagementService],
  exports: [RoomManagementService],
})
export class RoomManagementModule {}
