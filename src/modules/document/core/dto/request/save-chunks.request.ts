import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ChunkItemDto {
  @ApiProperty()
  @IsInt()
  @Min(0)
  chunkIndex: number;

  @ApiProperty()
  @IsString()
  content: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  tokenCount: number;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class SaveChunksRequest {
  @ApiProperty({ type: [ChunkItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChunkItemDto)
  chunks: ChunkItemDto[];
}
