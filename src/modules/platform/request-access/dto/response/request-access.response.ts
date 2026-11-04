import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RequestAccessResponse {
  @ApiProperty({ example: true })
  accepted: boolean;

  @ApiProperty({ example: '2026-04-22T03:45:00.000Z' })
  submittedAt: string;

  @ApiPropertyOptional({ example: 'platform-landing-page' })
  source?: string;
}
