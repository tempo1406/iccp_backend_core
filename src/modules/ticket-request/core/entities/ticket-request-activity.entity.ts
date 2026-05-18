import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TicketRequestStatus } from './ticket-request.entity';

export enum TicketRequestActivityAction {
  CREATED = 'created',
  SUBMITTED = 'submitted',
  UPDATED = 'updated',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CHANGES_REQUESTED = 'changes_requested',
  CANCELED = 'canceled',
  COMMENTED = 'commented',
  CC_ADDED = 'cc_added',
  CC_REMOVED = 'cc_removed',
}

@Entity({ schema: 'tenant', name: 'ticket_request_activities' })
export class TicketRequestActivity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'ticket_request_id', type: 'uuid' })
  ticketRequestId: string;

  @Column({ name: 'actor_id', type: 'uuid' })
  actorId: string;

  @Column({
    name: 'action',
    type: 'enum',
    enum: TicketRequestActivityAction,
    enumName: 'ticket_request_activity_action',
  })
  action: TicketRequestActivityAction;

  @Column({
    name: 'from_status',
    type: 'enum',
    enum: TicketRequestStatus,
    enumName: 'ticket_request_status',
    nullable: true,
  })
  fromStatus?: TicketRequestStatus;

  @Column({
    name: 'to_status',
    type: 'enum',
    enum: TicketRequestStatus,
    enumName: 'ticket_request_status',
    nullable: true,
  })
  toStatus?: TicketRequestStatus;

  @Column({ name: 'payload', type: 'jsonb', nullable: true })
  payload?: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
