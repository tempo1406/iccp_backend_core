import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum DocumentStatus {
  NOT_INDEXED = 'not_indexed',
  PENDING = 'pending',
  PROCESSING = 'processing',
  INDEXED = 'indexed',
  FAILED = 'failed',
}

export enum DocumentAccessScope {
  PRIVATE = 'private',
  ORGANIZATION = 'organization',
  PROJECT = 'project',
  ROLE = 'role',
  USER = 'user',
  SYSTEM = 'system',
}

@Entity({ schema: 'knowledge', name: 'documents' })
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // null = system-level document (uploaded by system admin)
  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId?: string;

  // Thư mục chứa document — null = chưa đặt vào folder nào
  @Column({ name: 'folder_id', type: 'uuid', nullable: true })
  folderId?: string;

  // Nhãn phân loại (HR, IT, Finance...) — null = chưa gán category
  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId?: string;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255, nullable: true })
  fileName?: string;

  @Column({ name: 'file_path', type: 'text' })
  filePath: string;

  @Column({ name: 'file_size', type: 'bigint', nullable: true })
  fileSize?: number;

  @Column({ name: 'file_type', type: 'varchar', length: 50, nullable: true })
  fileType?: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 100, nullable: true })
  mimeType?: string;

  @Column({ name: 'uploaded_by', type: 'uuid' })
  uploadedBy: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: DocumentStatus.NOT_INDEXED,
    comment: 'not_indexed, pending, processing, indexed, failed',
  })
  status: string;

  @Column({
    name: 'access_scope',
    type: 'varchar',
    length: 50,
    default: DocumentAccessScope.ORGANIZATION,
    comment: 'private, organization, project, role, user, system',
  })
  accessScope: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'indexed_at', type: 'timestamp', nullable: true })
  indexedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
