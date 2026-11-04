import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateRoomPoliciesRequest {
  @ApiPropertyOptional({
    example: true,
    description: 'Cho phép role member ghim message trong room này',
  })
  @IsOptional()
  @IsBoolean()
  allowMemberPinMessages?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Cho phép role guest ghim message trong room này',
  })
  @IsOptional()
  @IsBoolean()
  allowGuestPinMessages?: boolean;
}
