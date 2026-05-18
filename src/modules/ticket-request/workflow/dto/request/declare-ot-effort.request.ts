import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OtEffortEntryDto {
  @ApiProperty({
    example: '2026-03-20',
    description: 'Ngày thực hiện OT (ISO date string YYYY-MM-DD).',
  })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 4, description: 'Số giờ OT trong ngày.' })
  @IsNumber()
  @IsPositive()
  @Max(4)
  hours: number;

  @ApiProperty({
    example: 'Implement ticket-request workflow service',
    description: 'Mô tả phần công việc OT.',
  })
  @IsString()
  @IsNotEmpty()
  taskDescription: string;

  @ApiPropertyOptional({
    example: 'Hoàn thiện approveTicket, rejectTicket, requestChanges methods.',
    description: 'Mô tả chi tiết công việc đã làm (tuỳ chọn).',
  })
  @IsOptional()
  @IsString()
  workDescription?: string;
}

export class DeclareOtEffortRequest {
  @ApiProperty({
    type: [OtEffortEntryDto],
    description: 'Danh sách các mục effort OT thực tế (tối thiểu 1 mục).',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OtEffortEntryDto)
  effortEntries: OtEffortEntryDto[];

  @ApiProperty({
    example: 8,
    description: 'Tổng số giờ OT thực tế.',
  })
  @IsNumber()
  @IsPositive()
  totalActualHours: number;

  @ApiPropertyOptional({
    example: 'Đã hoàn thành đúng yêu cầu sprint, không phát sinh ngoài scope.',
    description: 'Tóm tắt chung về effort đã khai báo (tuỳ chọn).',
  })
  @IsOptional()
  @IsString()
  effortDetail?: string;

  @ApiPropertyOptional({
    example: '307f0059-51fa-43ea-b1dc-a9629ca1389f',
    description:
      'UUID của PM sẽ confirm bước tiếp theo. Mặc định = ticket.delegateId hiện tại.',
  })
  @IsOptional()
  @IsUUID()
  nextDelegateId?: string;
}
