import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export enum PersonalInboxReadKind {
  MENTIONS = 'mentions',
  NOTIFICATIONS = 'notifications',
}

export class MarkPersonalInboxRoomReadRequest {
  @ApiPropertyOptional({
    description:
      "Loai du lieu can mark read. Mac dinh ['mentions','notifications'] neu bo trong.",
    enum: PersonalInboxReadKind,
    isArray: true,
    example: [
      PersonalInboxReadKind.MENTIONS,
      PersonalInboxReadKind.NOTIFICATIONS,
    ],
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(PersonalInboxReadKind, { each: true })
  includeKinds?: PersonalInboxReadKind[];

  @ApiPropertyOptional({
    description: 'Nguon trigger de phuc vu telemetry/audit.',
    example: 'active_room_visible',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  source?: string;

  @ApiPropertyOptional({
    description:
      'Optional for future up-to semantics. V1 currently accepts and ignores.',
    format: 'uuid',
    example: 'fd4f66c6-9a07-4c49-bf90-d82a8a6f27fa',
  })
  @IsOptional()
  @IsUUID()
  upToMessageId?: string;
}

