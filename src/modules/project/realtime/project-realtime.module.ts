import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectCoreModule } from '../core/project-core.module';
import { WebsocketModule } from '@modules/websocket/websocket.module';
import { ProjectGateway } from './project.gateway';
import { ProjectRealtimeListener } from './project-realtime.listener';
import { ProjectRealtimeBindings } from './project-realtime.bindings';
import { StatusTask } from '../status-task/entities/status-task.entity';
import { ProjectRealtimeSocketService } from './project-realtime-socket.service';

@Module({
  imports: [
    WebsocketModule,
    ProjectCoreModule,
    TypeOrmModule.forFeature([StatusTask]),
  ],
  providers: [
    ProjectGateway,
    ProjectRealtimeListener,
    ProjectRealtimeBindings,
    ProjectRealtimeSocketService,
  ],
})
export class ProjectRealtimeModule {}
