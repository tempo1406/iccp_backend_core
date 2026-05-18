import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

export type ChatRoomTabConfigItem = {
  id: string;
  order: number;
  hidden: boolean;
};

@Entity({ schema: 'chat', name: 'room_tabs' })
@Unique(['organizationId', 'roomId'])
@Index(['organizationId', 'roomId'])
export class ChatRoomTabConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'room_id', type: 'uuid' })
  roomId: string;

  @Column({
    name: 'tabs',
    type: 'jsonb',
    default: () => "'[]'::jsonb",
  })
  tabs: ChatRoomTabConfigItem[];

  @Column({ name: 'updated_by', type: 'uuid' })
  updatedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
