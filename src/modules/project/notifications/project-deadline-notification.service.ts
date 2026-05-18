import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../task-management/entities/task.entity';
import {
  buildTaskDueCutoffSql,
  isTaskDuePassed,
} from '../task-management/utils/task-due-date.helper';
import { StatusTask } from '../status-task/entities/status-task.entity';
import { PROJECT_NOTIFICATION_TYPES } from './constants/project-notification-events.constant';
import { ProjectNotificationListener } from './project-notification.listener';

const DEADLINE_CHECK_INTERVAL_MS = 5 * 60 * 1000;
const DUE_SOON_WINDOW_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class ProjectDeadlineNotificationService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ProjectDeadlineNotificationService.name);
  private timer?: NodeJS.Timeout;
  private isScanning = false;

  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(StatusTask)
    private readonly statusTaskRepo: Repository<StatusTask>,
    private readonly projectNotificationListener: ProjectNotificationListener,
  ) {}

  onModuleInit(): void {
    void this.scanAndNotify().catch((error) => {
      this.logger.error(`Initial deadline scan failed: ${String(error)}`);
    });

    this.timer = setInterval(() => {
      void this.scanAndNotify().catch((error) => {
        this.logger.error(`Deadline scan failed: ${String(error)}`);
      });
    }, DEADLINE_CHECK_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async scanAndNotify(): Promise<void> {
    if (this.isScanning) {
      this.logger.warn('Deadline scan already in progress, skipping interval');
      return;
    }
    this.isScanning = true;
    try {
      await this.doScan();
    } finally {
      this.isScanning = false;
    }
  }

  private async doScan(): Promise<void> {
    const now = new Date();
    const dueSoonAt = new Date(now.getTime() + DUE_SOON_WINDOW_MS);

    const candidateTasks = await this.taskRepo
      .createQueryBuilder('task')
      .leftJoin(
        StatusTask,
        'status',
        [
          'status.id = task.status_id',
          'status.project_id = task.project_id',
          'status.organization_id = task.organization_id',
          'status.deleted_at IS NULL',
        ].join(' AND '),
      )
      .where('task.deleted_at IS NULL')
      .andWhere('task.assigned_to IS NOT NULL')
      .andWhere('task.due_date IS NOT NULL')
      .andWhere(
        "LOWER(REGEXP_REPLACE(COALESCE(status.name, ''), '\\s+', '_', 'g')) <> :doneStatus",
        { doneStatus: 'done' },
      )
      .andWhere(`${buildTaskDueCutoffSql()} <= :dueSoonAt`, { dueSoonAt })
      .select([
        'task.id AS "id"',
        'task.project_id AS "projectId"',
        'task.organization_id AS "organizationId"',
        'task.assigned_to AS "assignedTo"',
        'task.due_date AS "dueDate"',
      ])
      .getRawMany<{
        id: string;
        projectId: string;
        organizationId: string;
        assignedTo: string;
        dueDate: Date;
      }>();

    for (const task of candidateTasks) {
      if (!task.assignedTo || !task.dueDate) continue;

      const dueDate = new Date(task.dueDate);
      const type = isTaskDuePassed(dueDate, now)
        ? PROJECT_NOTIFICATION_TYPES.TASK_OVERDUE
        : PROJECT_NOTIFICATION_TYPES.TASK_DUE_SOON;

      await this.projectNotificationListener.sendDeadlineNotification({
        userId: task.assignedTo,
        type,
        taskId: task.id,
        dueDate: dueDate.toISOString(),
      });
    }
  }
}
