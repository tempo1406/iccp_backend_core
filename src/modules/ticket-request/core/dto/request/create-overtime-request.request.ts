import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateOvertimeRequestRequest {
  @ApiProperty({ example: 'OT tháng 3 — dự án ICCP Portal' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({
    example: '307f0059-51fa-43ea-b1dc-a9629ca1389f',
    description: 'UUID của dự án liên quan (bắt buộc).',
  })
  @IsNotEmpty()
  @IsUUID()
  projectId: string;

  @ApiProperty({
    example: '2026-03-20T18:00:00.000Z',
    description: 'Thời điểm bắt đầu OT (bắt buộc).',
  })
  @IsDateString()
  startAt: string;

  @ApiProperty({
    example: '2026-03-20T22:00:00.000Z',
    description: 'Thời điểm kết thúc OT (bắt buộc).',
  })
  @IsDateString()
  endAt: string;

  @ApiPropertyOptional({
    example: 4,
    description: 'Số giờ OT dự kiến.',
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  plannedHours?: number;

  @ApiPropertyOptional({
    example: 'Hoàn thiện module ticket request trước deadline sprint',
    description: 'Phạm vi / kế hoạch OT dự kiến.',
  })
  @IsOptional()
  @IsString()
  scope?: string;

  @ApiPropertyOptional({ example: 'project_deadline' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reasonCode?: string;

  @ApiPropertyOptional({ example: 'Cần hoàn thành tính năng trước ngày demo.' })
  @IsOptional()
  @IsString()
  reasonDetail?: string;

  @ApiPropertyOptional({
    example: '307f0059-51fa-43ea-b1dc-a9629ca1389f',
    description:
      'UUID của người sẽ khai báo effort OT (bước PROJECT_MEMBER_DECLARE_OT). Mặc định = requester.',
  })
  @IsOptional()
  @IsUUID()
  effortOwnerId?: string;

  @ApiPropertyOptional({
    type: [String],
    example: [
      '307f0059-51fa-43ea-b1dc-a9629ca1389f',
      'd6f8c6a9-a428-4de2-8ca4-65f59b10f005',
    ],
    description:
      'Danh sach UUID nhung nguoi se khai bao effort OT. Neu truyen field nay thi se uu tien hon effortOwnerId.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsUUID(undefined, { each: true })
  effortOwnerIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['307f0059-51fa-43ea-b1dc-a9629ca1389f'],
    description: 'CC members (UUID array, tối đa 50).',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID(undefined, { each: true })
  ccMemberIds?: string[];
}
