import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

const toBoolean = (value: unknown): unknown => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};

export class GetRoomDetailQueryRequest {
  @ApiPropertyOptional({
    description:
      'Mac dinh true de giu backward compatibility. Dat false de bo qua danh sach members (light payload).',
    default: true,
  })
  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  includeMembers?: boolean = true;
}
