import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { ResourcePermission } from '../../core/entities/document-access.entity';

@Entity({ schema: 'knowledge', name: 'folder_access_rules' })
export class FolderAccessRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'folder_id', type: 'uuid' })
  folderId: string;

  @Column({ name: 'access_type', type: 'varchar', length: 50 })
  accessType: string;

  @Column({ name: 'access_id', type: 'uuid' })
  accessId: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: ResourcePermission.VIEW,
    comment: 'view | download | upload | edit | manage',
  })
  permission: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
