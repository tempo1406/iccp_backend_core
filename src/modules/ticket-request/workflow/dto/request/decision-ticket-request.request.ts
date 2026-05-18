import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class ApproveTicketRequestRequest {
  @ApiPropertyOptional({ example: 'Dong y yeu cau nghi phep.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @ApiPropertyOptional({
    example: '307f0059-51fa-43ea-b1dc-a9629ca1389f',
    description:
      'Nguoi duoc gan cho buoc xu ly tiep theo (neu co). User nay bat buoc co permission ticket_requests.delegate.',
  })
  @IsOptional()
  @IsUUID()
  nextDelegateId?: string;
}

export class RejectTicketRequestRequest {
  @ApiProperty({ example: 'Thoi gian nghi khong phu hop voi ke hoach du an.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  reason: string;

  @ApiPropertyOptional({
    example: '307f0059-51fa-43ea-b1dc-a9629ca1389f',
    description:
      'Nguoi duoc gan cho buoc xu ly tiep theo sau khi submit lai (neu can). User nay bat buoc co permission ticket_requests.delegate.',
  })
  @IsOptional()
  @IsUUID()
  nextDelegateId?: string;
}

export class RequestChangesTicketRequestRequest {
  @ApiProperty({ example: 'Vui long bo sung ly do va ban giao cong viec.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  reason: string;

  @ApiPropertyOptional({
    example: '307f0059-51fa-43ea-b1dc-a9629ca1389f',
    description:
      'Nguoi duoc gan cho buoc xu ly tiep theo sau khi submit lai (neu can). User nay bat buoc co permission ticket_requests.delegate.',
  })
  @IsOptional()
  @IsUUID()
  nextDelegateId?: string;
}
