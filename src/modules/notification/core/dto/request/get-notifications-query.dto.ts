import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export enum NotificationFeedScope {
  ALL = 'all',
  ACTIVITY = 'activity',
}

export class GetNotificationsQueryDto {
  @ApiPropertyOptional({
    enum: NotificationFeedScope,
    description:
      'Notification feed scope. Defaults to "all" when omitted for backward compatibility.',
    example: NotificationFeedScope.ALL,
  })
  @IsOptional()
  @IsEnum(NotificationFeedScope)
  scope?: NotificationFeedScope;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  unreadOnly?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
