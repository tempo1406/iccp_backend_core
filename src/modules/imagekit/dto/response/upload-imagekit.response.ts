import { ApiProperty } from '@nestjs/swagger';

export class UploadImagekitResponse {
  @ApiProperty({ example: 'https://ik.imagekit.io/xxx/uploads/image.jpg' })
  url: string;

  @ApiProperty({ example: 'image.jpg' })
  fileName: string;

  @ApiProperty({ example: '/uploads/avatars' })
  folder: string;

  @ApiProperty({ example: 204800 })
  size: number;

  @ApiProperty({ example: 'image', enum: ['image', 'non-image'] })
  fileType: 'image' | 'non-image';

  @ApiProperty({ example: 'jpg', description: 'File extension without dot' })
  extension: string;
}
