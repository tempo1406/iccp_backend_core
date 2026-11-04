import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ProjectBudgetCurrency,
  ProjectPriority,
  ProjectStatus,
} from '../../entities/project.entity';

export class ProjectResponse {
  @ApiProperty({ example: 'f8f1e2ff-7f9d-4ce2-9301-a497f376facd' })
  id: string;

  @ApiProperty({ example: '18d17aea-7e8c-4a58-8e56-74c2949dcdd6' })
  organizationId: string;

  @ApiProperty({ example: 'ICCP Core Platform' })
  name: string;

  @ApiPropertyOptional({ example: 'Main project for core backend services' })
  description?: string;

  @ApiProperty({ example: 'ICCP' })
  slug: string;

  @ApiProperty({ enum: ProjectStatus, example: ProjectStatus.PLANNING })
  status: ProjectStatus;

  @ApiProperty({ enum: ProjectPriority, example: ProjectPriority.MEDIUM })
  priority: ProjectPriority;

  @ApiPropertyOptional({ example: '2026-03-03' })
  startDate?: Date;

  @ApiPropertyOptional({ example: '2026-12-31' })
  endDate?: Date;

  @ApiPropertyOptional({
    type: [String],
    example: [
      '4b6f223b-2e53-4698-aa8e-6570f6cb2f60',
      '2f9f0b0a-7c92-4f5d-a13f-73bc3e0d6aa1',
    ],
  })
  managerId?: string[];

  @ApiProperty({ example: '4b6f223b-2e53-4698-aa8e-6570f6cb2f60' })
  createdBy: string;

  @ApiPropertyOptional({ example: 20000 })
  estimatedBudget?: number;

  @ApiPropertyOptional({ example: 12000 })
  actualBudget?: number;

  @ApiProperty({
    enum: ProjectBudgetCurrency,
    example: ProjectBudgetCurrency.VND,
  })
  budgetCurrency: ProjectBudgetCurrency;

  @ApiProperty({ example: 0 })
  progress: number;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
