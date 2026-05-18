import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatusTaskController } from './status-task.controller';
import { StatusTaskService } from './status-task.service';
import { StatusTask } from './entities/status-task.entity';
import { Task } from '../task-management/entities/task.entity';
import { ProjectCoreModule } from '../core/project-core.module';

@Module({
  imports: [ProjectCoreModule, TypeOrmModule.forFeature([StatusTask, Task])],
  controllers: [StatusTaskController],
  providers: [StatusTaskService],
  exports: [StatusTaskService],
})
export class StatusTaskModule {}
