import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class DeleteStatusTaskRequest {
  @ApiPropertyOptional({
    example: '4b6f223b-2e53-4698-aa8e-6570f6cb2f60',
    description: 'Optional target status to move tasks before deleting status',
  })
  @IsOptional()
  @IsUUID()
  moveToStatusId?: string;
}
