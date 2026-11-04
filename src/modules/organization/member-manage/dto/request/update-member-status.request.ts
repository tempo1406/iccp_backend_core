import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateMemberStatusRequest {
  @ApiProperty({
    example: false,
    description:
      'Trạng thái active/inactive của member. false = deactivate, true = reactivate.',
  })
  @IsBoolean()
  isActive: boolean;
}
