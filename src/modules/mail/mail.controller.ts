import { Controller, Post, Body } from '@nestjs/common';
import { MaillerService } from './mail.service';
import { WelcomeMailDTO } from './dto/create-mailler.dto';
import { Public } from '@common/decorators/auth/public.decorator';
import { ApiOperation } from '@nestjs/swagger';
import { ApiResponseDto } from '@common/dto/api-response.dto';

@Controller({ path: 'mailler', version: '1' })
export class MaillerController {
  constructor(private readonly maillerService: MaillerService) {}

  @Public()
  @ApiOperation({ summary: 'Send mail test welcome' })
  @Post('sendmail')
  create(@Body() createMaillerDto: WelcomeMailDTO) {
    this.maillerService.sendMailWelcome(createMaillerDto);
    return new ApiResponseDto(200, 'Mail sent successfully');
  }
}
