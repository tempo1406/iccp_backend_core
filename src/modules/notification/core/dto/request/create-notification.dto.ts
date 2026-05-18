import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateNotificationDto {
  @IsUUID()
  userId: string;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsOptional()
  data?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  dedupeKey?: string;

  @IsOptional()
  @IsBoolean()
  emitRealtime?: boolean;
  @IsUUID()
  @IsOptional()
  senderId?: string;

  @IsString()
  @IsOptional()
  senderName?: string;

  @IsString()
  @IsOptional()
  senderAvatarUrl?: string;

  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}
