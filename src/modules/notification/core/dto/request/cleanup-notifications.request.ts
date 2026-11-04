import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class CleanupNotificationsRequest {
  @ApiPropertyOptional({
    description:
      'Retention window in days for read notifications before permanent deletion. Default: 90.',
    example: 90,
    minimum: 7,
    maximum: 3650,
  })
  @IsOptional()
  @IsInt()
  @Min(7)
  @Max(3650)
  readRetentionDays?: number;

  @ApiPropertyOptional({
    description:
      'Retention window in days for all notifications before permanent deletion. Default: 365.',
    example: 365,
    minimum: 30,
    maximum: 3650,
  })
  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(3650)
  hardRetentionDays?: number;
}
