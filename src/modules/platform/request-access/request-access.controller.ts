import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Public } from '@common/decorators/auth/public.decorator';
import { ApiOperationAuto } from '@common/decorators/swagger/api-operation.decorator';
import { ApiResponseDto } from '@common/dto/api-response.dto';

import { SubmitRequestAccessRequest } from './dto/request/submit-request-access.request';
import { RequestAccessResponse } from './dto/response/request-access.response';
import { RequestAccessService } from './request-access.service';

@ApiTags('Platform Request Access')
@Controller({ path: 'platform/request-access', version: '1' })
export class RequestAccessController {
  constructor(private readonly requestAccessService: RequestAccessService) {}

  @Public()
  @Post()
  @HttpCode(201)
  @ApiOperationAuto(
    'Submit request access',
    'Accept a public request access submission from the ICCP platform landing page and send it to the system mailbox.',
  )
  async submit(
    @Body() dto: SubmitRequestAccessRequest,
  ): Promise<ApiResponseDto<RequestAccessResponse>> {
    const data = await this.requestAccessService.submit(dto);
    return new ApiResponseDto(201, 'Request access submitted successfully', data);
  }
}
