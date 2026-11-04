import { ApiProperty } from '@nestjs/swagger';

export class StatusTaskResponse {
  @ApiProperty({ example: '8f0bc90e-9d5f-4c66-9e10-8ae567f2d8ea' })
  id: string;

  @ApiProperty({ example: 'f8f1e2ff-7f9d-4ce2-9301-a497f376facd' })
  projectId: string;

  @ApiProperty({ example: '18d17aea-7e8c-4a58-8e56-74c2949dcdd6' })
  organizationId: string;

  @ApiProperty({ example: 'In Progress' })
  name: string;

  @ApiProperty({ example: 2 })
  orderIndex: number;

  @ApiProperty({ example: false })
  isDefault: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
