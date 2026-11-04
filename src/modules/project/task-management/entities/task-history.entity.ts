import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum TaskHistoryAction {
  CREATE = 'create',
  STATUS_CHANGE = 'status_change',
  DESCRIPTION_CHANGE = 'description_change',
  COMMENT_ADD = 'comment_add',
  TAG_ADD = 'tag_add',
  TAG_REMOVE = 'tag_remove',
  ATTACHMENT_ADD = 'attachment_add',
  ATTACHMENT_REMOVE = 'attachment_remove',
}

@Entity({ schema: 'project', name: 'task_histories' })
export class TaskHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'task_id', type: 'uuid' })
  taskId: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({
    type: 'enum',
    enum: TaskHistoryAction,
  })
  action: TaskHistoryAction;

  @Column({ name: 'from_value', type: 'text', nullable: true })
  fromValue?: string;

  @Column({ name: 'to_value', type: 'text', nullable: true })
  toValue?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @Column({ name: 'actor_id', type: 'uuid' })
  actorId: string;

  @Column({ name: 'actor_display_name', type: 'varchar', length: 255 })
  actorDisplayName: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
