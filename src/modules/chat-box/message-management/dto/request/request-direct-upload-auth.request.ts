import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, type TransformFnParams } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

const trimTransformedString = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : (value as unknown);

export class RequestDirectUploadAuthRequest {
  @ApiPropertyOptional({
    example: 'upload-7d7e31df0f964ac2b8f2b7',
    description:
      'Key idempotency phia FE cho upload flow. Khuyen nghi UUID/ULID.',
  })
  @IsOptional()
  @Transform(trimTransformedString)
  @IsString()
  @MaxLength(100)
  clientUploadId?: string;

  @ApiPropertyOptional({
    example: 'proposal-q2.docx',
  })
  @IsOptional()
  @Transform(trimTransformedString)
  @IsString()
  @MaxLength(255)
  fileName?: string;
}
