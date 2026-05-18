import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity({ schema: 'knowledge', name: 'document_versions' })
export class DocumentVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @Column({ type: 'int' })
  version: number;

  @Column({ name: 'file_path', type: 'text' })
  filePath: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255, nullable: true })
  fileName?: string;

  @Column({ name: 'file_size', type: 'bigint', nullable: true })
  fileSize?: number;

  @Column({ name: 'uploaded_by', type: 'uuid' })
  uploadedBy: string;

  @Column({ name: 'change_notes', type: 'text', nullable: true })
  changeNotes?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
