import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProjectMemberRequest {
  @ApiPropertyOptional({ example: '4b6f223b-2e53-4698-aa8e-6570f6cb2f60' })
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @ApiPropertyOptional({ example: 6, description: 'Allocated working hours per day for this member (PM only)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(24)
  allocatedHoursPerDay?: number;
}
