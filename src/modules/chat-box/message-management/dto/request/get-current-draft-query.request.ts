import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class GetCurrentDraftQueryRequest {
  @ApiPropertyOptional({
    description: 'Thread root message id for thread composer context',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  threadRootMessageId?: string;

  @ApiPropertyOptional({
    description: 'Parent message id for reply composer context',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  parentMessageId?: string;
}
