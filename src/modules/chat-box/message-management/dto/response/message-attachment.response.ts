import {
  ChatAttachmentDocumentType,
  ChatAttachmentPreviewStatus,
  ChatAttachmentType,
} from '@modules/chat-box/message-management/entities/message-attachment.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type ChatAttachmentPreviewAssetSource =
  | 'rendered'
  | 'derived'
  | 'fallback'
  | 'none';

export type { ChatAttachmentDocumentType, ChatAttachmentPreviewStatus };

export class MessageAttachmentResponse {
  @ApiProperty({
    example: 'f91df38e-c2a9-44ea-bf78-540f0df9d26b',
    description:
      'UUID bản ghi file đính kèm trong bảng chat.message_attachments.',
  })
  id: string;

  @ApiProperty({ example: '1f233462-a2ea-4292-a620-bf6516bfb8f8' })
  organizationId: string;

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

  @ApiPropertyOptional({
    example: '184220',
    description: 'Kích thước file dạng chuỗi vì DB lưu kiểu bigint.',
  })
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
      'https://ik.imagekit.io/your-space/chat/org-1/room-1/video.mp4?tr=so-1,w-480',
    description:
      'Thumbnail url de render nhanh o list (co the undefined voi file khong ho tro)',
  })
  thumbnailUrl?: string;

  @ApiPropertyOptional({
    example:
      'https://ik.imagekit.io/your-space/chat/org-1/room-1/video.mp4?tr=so-1,w-480,w-240,q-60,f-webp',
    description: 'Thumbnail size nho de render list/sidebar nhanh hon',
  })
  thumbnailUrlSmall?: string;

  @ApiPropertyOptional({
    example:
      'https://ik.imagekit.io/your-space/chat/org-1/room-1/video.mp4?tr=so-1,w-480,w-480,q-70,f-webp',
    description: 'Thumbnail size vua de render card trong message stream',
  })
  thumbnailUrlMedium?: string;

  @ApiPropertyOptional({
    example:
      'https://view.officeapps.live.com/op/embed.aspx?src=https%3A%2F%2Fik.imagekit.io%2Fyour-space%2Fchat%2Forg-1%2Froom-1%2Fspec.docx',
    description:
      'Preview url cho file non-image (video/pdf/docx/xlsx/pptx) neu backend suy luan duoc',
  })
  previewUrl?: string;

  @ApiPropertyOptional({
    example:
      'https://view.officeapps.live.com/op/embed.aspx?src=https%3A%2F%2Fik.imagekit.io%2Fyour-space%2Fchat%2Forg-1%2Froom-1%2Fspec.docx',
    description:
      'URL de mo attachment tu UI. Voi office/file se uu tien previewUrl, voi image/video/audio se fallback fileUrl.',
  })
  openUrl?: string;

  @ApiPropertyOptional({
    example:
      'https://ik.imagekit.io/your-space/chat/org-1/room-1/spec.docx?ik-attachment=true',
    description:
      'URL de tai file, backend them ik-attachment=true de uu tien browser download thay vi inline render.',
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
    description:
      'Phan loai nguon cua thumbnail/preview asset de FE phan biet preview noi dung that voi generic fallback',
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
    description:
      'Version token de FE bo qua patch cu/stale va tranh rerender khong can thiet',
  })
  previewVersion?: string;

  @ApiProperty({ example: '2026-03-14T09:22:39.996Z' })
  createdAt: Date;
}
