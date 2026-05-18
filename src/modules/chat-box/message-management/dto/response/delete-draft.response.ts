import { ApiProperty } from '@nestjs/swagger';

export class DeleteDraftResponse {
  @ApiProperty({ example: 'd53303f1-76f9-4ad9-a17e-f23ae58f16dc' })
  draftId: string;

  @ApiProperty({ example: true })
  deleted: boolean;
}
