import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TaskAttachmentResponse {
  @ApiProperty({ example: 'a8e8a8e9-2f16-48d8-a8ad-ef523f57aa36' })
  id: string;

  @ApiProperty({ example: 'b56bc271-dd9c-47ea-95d6-26ddf2f64fca' })
  taskId: string;

  @ApiProperty({ example: 'api-contract-v1.pdf' })
  fileName: string;

  @ApiProperty({ example: 'https://cdn.example.com/files/api-contract-v1.pdf' })
  fileUrl: string;

  @ApiProperty({
    example: 'local_file',
    enum: ['local_file', 'web_link'],
  })
  attachmentType: 'local_file' | 'web_link';

  @ApiProperty({
    example:
      '/api/v1/projects/b56bc271-dd9c-47ea-95d6-26ddf2f64fca/tasks/c8cc10a0-88cf-4208-90f4-969c14f55bb9/attachments/a8e8a8e9-2f16-48d8-a8ad-ef523f57aa36/content',
    description:
      'URL truy cập attachment. Với web_link sẽ bằng fileUrl; với local_file là endpoint stream file.',
  })
  accessUrl: string;

  @ApiPropertyOptional({ example: 'application/pdf' })
  mimeType?: string;

  @ApiPropertyOptional({ example: 245760 })
  fileSize?: number;

  @ApiProperty({ example: '4b6f223b-2e53-4698-aa8e-6570f6cb2f60' })
  uploadedBy: string;

  @ApiProperty({ example: '2026-03-04T10:30:00.000Z' })
  createdAt: Date;
}
