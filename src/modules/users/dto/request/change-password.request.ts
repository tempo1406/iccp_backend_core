import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordRequest {
  @ApiProperty({
    example: 'currentPassword123',
    description: 'Mật khẩu hiện tại',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  oldPassword: string;

  @ApiProperty({
    example: 'newSecurePassword456',
    description: 'Mật khẩu mới (tối thiểu 8 ký tự)',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword: string;
}
