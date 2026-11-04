import {
  Controller,
  Post,
  Delete,
  UseInterceptors,
  UploadedFile,
  Body,
  Get,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImageKitService } from './imagekit.service';
import { Public } from '@common/decorators/auth/public.decorator';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { ApiOperationAuto } from '@common/decorators/swagger/api-operation.decorator';
import { ApiResponseDto } from '@common/dto/api-response.dto';
import { DeleteImagekitRequest } from './dto/request/delete-imagekit.request';
import { UploadImagekitResponse } from './dto/response/upload-imagekit.response';

@Controller({ path: 'imagekit', version: '1' })
@ApiTags('ImageKit')
export class ImageKitController {
  constructor(private readonly imagekitService: ImageKitService) {}

  @Public()
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        folder: { type: 'string', example: 'uploads/avatars' },
      },
    },
  })
  @ApiOperationAuto(
    'Upload file lên ImageKit',
    'Upload ảnh hoặc media file, có thể chỉ định folder',
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder?: string,
  ): Promise<ApiResponseDto<UploadImagekitResponse>> {
    const result = await this.imagekitService.uploadFile(file, folder);
    return new ApiResponseDto<UploadImagekitResponse>(
      200,
      'Uploaded successfully',
      result,
    );
  }

  @Public()
  @Delete()
  @ApiOperationAuto('Xóa file trên ImageKit', 'Truyền URL của file cần xóa')
  async delete(@Body() body: DeleteImagekitRequest) {
    await this.imagekitService.deleteFileByUrl(body);
    return new ApiResponseDto(200, 'File deleted successfully');
  }

  @Public()
  @Get('list')
  @ApiOperationAuto(
    'Lấy danh sách file',
    'Lấy danh sách file trong một thư mục cụ thể trên ImageKit',
  )
  async list(@Query('path') path: string) {
    if (!path) {
      return new ApiResponseDto(400, 'Path is required');
    }
    const result = await this.imagekitService.listFilesInFolder(path);
    return new ApiResponseDto(200, 'Files fetched successfully', result);
  }
}
