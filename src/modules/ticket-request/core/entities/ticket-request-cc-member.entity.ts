import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity({ schema: 'tenant', name: 'ticket_request_cc_members' })
@Unique(['ticketRequestId', 'memberId'])
export class TicketRequestCcMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'ticket_request_id', type: 'uuid' })
  ticketRequestId: string;

  @Column({ name: 'member_id', type: 'uuid' })
  memberId: string;

  @Column({ name: 'added_by', type: 'uuid' })
  addedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
