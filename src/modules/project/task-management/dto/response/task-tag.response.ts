import { ApiProperty } from '@nestjs/swagger';

export class TaskTagResponse {
  @ApiProperty({ example: 'c2eaf574-d9df-4e58-9dfe-141e8995dc5c' })
  id: string;

  @ApiProperty({ example: 'b56bc271-dd9c-47ea-95d6-26ddf2f64fca' })
  taskId: string;

  @ApiProperty({ example: 'Backend' })
  name: string;

  @ApiProperty({ example: 'backend' })
  normalizedName: string;

  @ApiProperty({ example: '2026-03-04T10:30:00.000Z' })
  createdAt: Date;
}
