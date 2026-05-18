import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DirectUploadAuthResponse {
  @ApiProperty({
    example:
      'chat/ebf11c0a-f8ac-4ddf-ad81-9e7c98ea1cd5/47e7a79a-20b7-4a4f-bfe2-122eaa8fee78',
  })
  folder: string;

  @ApiProperty({ example: '4ef56f8d5eaf2e9f9c0f87a3f8fa57db2f11f3b2' })
  token: string;

  @ApiProperty({
    example: 1762400000,
    description: 'Unix timestamp (seconds) het han token',
  })
  expire: number;

  @ApiProperty({
    example: '89e4f6a9b6f31b11e94f92a2e9f59ea4f52b31ab',
  })
  signature: string;

  @ApiProperty({
    example: 'public_xxx',
  })
  publicKey: string;

  @ApiProperty({
    example: 'https://upload.imagekit.io/api/v1/files/upload',
  })
  uploadEndpoint: string;

  @ApiPropertyOptional({
    example: 'upload-7d7e31df0f964ac2b8f2b7',
  })
  clientUploadId?: string;

  @ApiPropertyOptional({
    example: 'proposal-q2.docx',
  })
  fileName?: string;
}
