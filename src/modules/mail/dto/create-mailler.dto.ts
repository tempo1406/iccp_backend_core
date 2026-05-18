import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
export class WelcomeMailDTO {
  @ApiProperty({
    description: 'Username',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    description: 'Email',
    // example: 'john.doe@example.com',
    example: 'thang09052004@gmail.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
