import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyEmailRequest {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: '123456',
    description: 'Mã OTP 6 chữ số gửi qua email',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  otp: string;
}
