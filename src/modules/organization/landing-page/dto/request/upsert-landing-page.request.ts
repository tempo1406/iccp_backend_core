import { IsArray, IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class BlockRecordDto {
  @IsString()
  id: string;

  @IsString()
  type: string;

  props: Record<string, unknown>;
}

export class UpsertLandingPageRequest {
  @ApiPropertyOptional({ type: [BlockRecordDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => BlockRecordDto)
  blocks?: BlockRecordDto[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  rawHtml?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  projectData?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}
