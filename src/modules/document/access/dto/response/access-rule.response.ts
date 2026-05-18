import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class AccessRuleResponse {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty({ description: 'user | role | project' })
  accessType: string;

  @Expose()
  @ApiProperty({ description: 'UUID của user / role / project' })
  accessId: string;

  @Expose()
  @ApiProperty({ description: 'view | download | upload | edit | manage' })
  permission: string;

  @Expose()
  @ApiProperty()
  createdAt: Date;
}
