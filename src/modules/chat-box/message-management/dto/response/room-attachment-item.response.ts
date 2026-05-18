import { ChatAttachmentType } from '@modules/chat-box/message-management/entities/message-attachment.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ChatAttachmentDocumentType,
  ChatAttachmentPreviewAssetSource,
  ChatAttachmentPreviewStatus,
} from './message-attachment.response';

export class RoomAttachmentItemResponse {
  @ApiProperty({ example: 'f91df38e-c2a9-44ea-bf78-540f0df9d26b' })
  attachmentId: string;

  @ApiProperty({ example: '2a14ea23-ce41-44be-825b-8bb8891716d1' })
  roomId: string;

  @ApiProperty({ example: 'ff5dd6f6-6b6c-4fd5-b2bc-7a4fcc38ed59' })
  messageId: string;

  @ApiProperty({ enum: ChatAttachmentType, example: ChatAttachmentType.IMAGE })
  attachmentType: ChatAttachmentType;

  @ApiProperty({ example: 'banner_q2_launch_v1.png' })
  fileName: string;

  @ApiProperty({
    example:
      'https://ik.imagekit.io/your-space/chat/org-1/room-1/banner_q2_launch_v1.png',
  })
  fileUrl: string;

  @ApiPropertyOptional({ example: 'image/png' })
  mimeType?: string;

  @ApiPropertyOptional({ example: '184220' })
  fileSize?: string;

  @ApiPropertyOptional({ example: 'sha256:5c58f26f5f6b7c3f...' })
  checksum?: string;

  @ApiPropertyOptional({ example: 1920 })
  width?: number;

  @ApiPropertyOptional({ example: 1080 })
  height?: number;

  @ApiPropertyOptional({ example: 4821 })
  durationMs?: number;

  @ApiPropertyOptional({
    example:
      'https://ik.imagekit.io/your-space/chat/org-1/room-1/banner_q2_launch_v1_thumbnail.png',
  })
  thumbnailUrl?: string;

  @ApiPropertyOptional({
    example:
      'https://ik.imagekit.io/your-space/chat/org-1/room-1/banner_q2_launch_v1_thumbnail.png?tr=w-240,q-60,f-webp',
  })
  thumbnailUrlSmall?: string;

  @ApiPropertyOptional({
    example:
      'https://ik.imagekit.io/your-space/chat/org-1/room-1/banner_q2_launch_v1_thumbnail.png?tr=w-480,q-70,f-webp',
  })
  thumbnailUrlMedium?: string;

  @ApiPropertyOptional({
    example:
      'https://view.officeapps.live.com/op/embed.aspx?src=https%3A%2F%2Fik.imagekit.io%2Fyour-space%2Fchat%2Forg-1%2Froom-1%2Fspec.docx',
  })
  previewUrl?: string;

  @ApiPropertyOptional({
    example:
      'https://view.officeapps.live.com/op/embed.aspx?src=https%3A%2F%2Fik.imagekit.io%2Fyour-space%2Fchat%2Forg-1%2Froom-1%2Fspec.docx',
  })
  openUrl?: string;

  @ApiPropertyOptional({
    example:
      'https://ik.imagekit.io/your-space/chat/org-1/room-1/spec.docx?ik-attachment=true',
  })
  downloadUrl?: string;

  @ApiPropertyOptional({
    enum: ['word', 'excel', 'powerpoint', 'pdf', 'text', 'archive', 'unknown'],
    example: 'word',
  })
  documentType?: ChatAttachmentDocumentType;

  @ApiPropertyOptional({
    enum: ['pending', 'ready', 'failed'],
    example: 'ready',
  })
  previewStatus?: ChatAttachmentPreviewStatus;

  @ApiPropertyOptional({
    enum: ['rendered', 'derived', 'fallback', 'none'],
    example: 'rendered',
  })
  previewAssetSource?: ChatAttachmentPreviewAssetSource;

  @ApiPropertyOptional({ example: 1200 })
  previewWidth?: number;

  @ApiPropertyOptional({ example: 1553 })
  previewHeight?: number;

  @ApiPropertyOptional({ example: 1 })
  previewPage?: number;

  @ApiPropertyOptional({ example: 12 })
  pageCount?: number;

  @ApiPropertyOptional({ example: '2026-03-21T05:00:08.000Z' })
  previewUpdatedAt?: Date;

  @ApiPropertyOptional({ example: 'preview_generation_failed' })
  previewErrorCode?: string;

  @ApiPropertyOptional({
    example: 'cGVuZGluZ3wyMDI2LTAzLTIxVDA5OjAwOjAwLjAwMFo',
  })
  previewVersion?: string;

  @ApiPropertyOptional({ example: '545390ea-3f05-4998-a35f-f78805045a9b' })
  sharedByUserId?: string;

  @ApiPropertyOptional({ example: 'Bao An' })
  sharedByName?: string;

  @ApiPropertyOptional({ example: 'dnote097@gmail.com' })
  sharedByEmail?: string;

  @ApiPropertyOptional({ example: '2026-03-18T03:00:00.000Z' })
  messageSentAt?: Date;

  @ApiProperty({ example: '2026-03-18T03:00:00.000Z' })
  createdAt: Date;
}
