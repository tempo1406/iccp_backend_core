import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsUUID } from 'class-validator';

export class CreateProjectInviteRequest {
  @ApiPropertyOptional({
    type: [String],
    example: [
      '4b6f223b-2e53-4698-aa8e-6570f6cb2f60',
      '2f9f0b0a-7c92-4f5d-a13f-73bc3e0d6aa1',
    ],
    description: 'Danh sách userId cần mời vào project',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  inviteeUserIds?: string[];

  @ApiPropertyOptional({
    example: '4b6f223b-2e53-4698-aa8e-6570f6cb2f60',
    description: 'Tương thích ngược: mời 1 user',
  })
  @IsOptional()
  @IsUUID()
  inviteeUserId?: string;
}
