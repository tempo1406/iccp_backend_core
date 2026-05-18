import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class FolderOrderItem {
  @ApiProperty({ description: 'ID folder' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Thứ tự hiển thị mới (0-based)' })
  @IsInt()
  @Min(0)
  sortOrder: number;
}

export class ReorderFoldersRequest {
  @ApiProperty({
    type: [FolderOrderItem],
    description: 'Danh sách folder cần cập nhật thứ tự',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => FolderOrderItem)
  items: FolderOrderItem[];
}
