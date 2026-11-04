import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UploadImagekitRequest {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: Express.Multer.File;

  @ApiProperty({ required: false, example: 'uploads/avatars' })
  @IsOptional()
  @IsString()
  folder?: string;
}
