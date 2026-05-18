import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class DeleteImagekitRequest {
  @ApiProperty({ example: 'https://ik.imagekit.io/xxx/uploads/image.jpg' })
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  url: string;
}
