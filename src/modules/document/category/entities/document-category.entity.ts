import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

@Entity({ schema: 'knowledge', name: 'document_categories' })
export class DocumentCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // null = system-level category (áp dụng cho mọi org)
  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId?: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;
}
