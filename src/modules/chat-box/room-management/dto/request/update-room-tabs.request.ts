import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class UpdateRoomTabsItemRequest {
  @ApiProperty({ example: 'messages' })
  @IsString()
  @MaxLength(50)
  id: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  order: number;

  @ApiProperty({ example: false })
  @IsBoolean()
  hidden: boolean;
}

export class UpdateRoomTabsRequest {
  @ApiProperty({
    type: [UpdateRoomTabsItemRequest],
    example: [
      { id: 'messages', order: 1, hidden: false },
      { id: 'files', order: 2, hidden: false },
      { id: 'photos', order: 3, hidden: true },
      { id: 'pins', order: 4, hidden: false },
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpdateRoomTabsItemRequest)
  tabs: UpdateRoomTabsItemRequest[];
}
