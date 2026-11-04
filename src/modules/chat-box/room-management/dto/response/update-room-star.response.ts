import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateRoomStarResponse {
  @ApiProperty({ example: '47e7a79a-20b7-4a4f-bfe2-122eaa8fee78' })
  roomId: string;

  @ApiProperty({ example: 'd2fa1df0-e403-4352-8013-8788c19de938' })
  userId: string;

  @ApiProperty({ example: true })
  isStarred: boolean;

  @ApiPropertyOptional({
    example: '2026-03-17T10:20:00.000Z',
    nullable: true,
  })
  starredAt?: Date;

  @ApiProperty({
    example: true,
    description:
      'True neu co thay doi star state, false neu request khong lam thay doi du lieu',
  })
  updated: boolean;
}
