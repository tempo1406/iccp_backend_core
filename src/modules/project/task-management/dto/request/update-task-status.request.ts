import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class UpdateTaskStatusRequest {
  @ApiProperty({ example: '8f0bc90e-9d5f-4c66-9e10-8ae567f2d8ea' })
  @IsNotEmpty()
  @IsUUID()
  statusId: string;
}
