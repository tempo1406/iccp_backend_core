import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UploadVersionRequest {
  @ApiPropertyOptional({
    description: 'Ghi chú về thay đổi trong version này',
    example: 'Cập nhật điều khoản nghỉ phép',
  })
  @IsString()
  @IsOptional()
  changeNotes?: string;
}
