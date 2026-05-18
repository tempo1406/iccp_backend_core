import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListRoomMessagesCursorQueryRequest {
  @ApiPropertyOptional({
    description: 'Gioi han so luong message',
    default: 30,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 30;

  @ApiPropertyOptional({
    description:
      'Cursor keyset dang base64url(JSON: { sentAt, id }). Bo trong de lay trang dau tien',
    example:
      'eyJzZW50QXQiOiIyMDI2LTAzLTIwVDA2OjE1OjAwLjAwMFoiLCJpZCI6IjFkYjZkYjRlLThjNWMtNDQ2NS1iOWVmLTQ0NTRhNjM3N2Y0YyJ9',
  })
  @IsOptional()
  @IsString()
  cursor?: string;
}
