import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum ChatAttachmentType {
  FILE = 'file',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
}

export type ChatAttachmentDocumentType =
  | 'word'
  | 'excel'
  | 'powerpoint'
  | 'pdf'
  | 'text'
  | 'archive'
  | 'unknown';

export type ChatAttachmentPreviewStatus = 'pending' | 'ready' | 'failed';

@Entity({ schema: 'chat', name: 'message_attachments' })
@Index(['messageId'])
@Index(['organizationId', 'attachmentType'])
export class ChatMessageAttachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'message_id', type: 'uuid' })
  messageId: string;

  @Column({
    name: 'attachment_type',
    type: 'enum',
    enum: ChatAttachmentType,
    enumName: 'chat_attachment_type_enum',
  })
  attachmentType: ChatAttachmentType;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName: string;

  @Column({ name: 'file_url', type: 'text' })
  fileUrl: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 150, nullable: true })
  mimeType?: string;

  @Column({ name: 'file_size', type: 'bigint', nullable: true })
  fileSize?: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  checksum?: string;

  @Column({ type: 'int', nullable: true })
  width?: number;

  @Column({ type: 'int', nullable: true })
  height?: number;

  @Column({ name: 'duration_ms', type: 'int', nullable: true })
  durationMs?: number;

  @Column({
    name: 'document_type',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  documentType?: ChatAttachmentDocumentType;

  @Column({
    name: 'preview_status',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  previewStatus?: ChatAttachmentPreviewStatus;

  @Column({ name: 'preview_thumbnail_url', type: 'text', nullable: true })
  previewThumbnailUrl?: string;

  @Column({ name: 'preview_url', type: 'text', nullable: true })
  previewUrl?: string;

  @Column({ name: 'preview_width', type: 'int', nullable: true })
  previewWidth?: number;

  @Column({ name: 'preview_height', type: 'int', nullable: true })
  previewHeight?: number;

  @Column({ name: 'preview_page', type: 'int', nullable: true })
  previewPage?: number;

  @Column({ name: 'page_count', type: 'int', nullable: true })
  pageCount?: number;

  @Column({
    name: 'preview_error_code',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  previewErrorCode?: string;

  @Column({ name: 'preview_updated_at', type: 'timestamp', nullable: true })
  previewUpdatedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
