import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import ImageKit from 'imagekit';
import { ImagekitConfig } from '@common/types/imagekit-config.type';
import { UploadImagekitResponse } from './dto/response/upload-imagekit.response';
import { DeleteImagekitRequest } from './dto/request/delete-imagekit.request';
import { ROOT_DIR } from '@common/constants/folder/dir.constant';

@Injectable()
export class ImageKitService {
  constructor(
    @Inject('IMAGEKIT') private readonly imagekit: ImageKit,
    private readonly configService: ConfigService,
  ) {}

  private toUploadResponse(response: any): UploadImagekitResponse {
    return {
      url: response.url,
      fileName: response.name,
      folder: response.filePath.replace(`/${response.name}`, ''),
      size: response.size,
      fileType: response.fileType as 'image' | 'non-image',
      extension: response.name.split('.').pop() ?? '',
    };
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'uploads',
  ): Promise<UploadImagekitResponse> {
    return this.uploadBuffer({
      buffer: file.buffer,
      fileName: file.originalname,
      folder,
    });
  }

  async uploadBuffer(payload: {
    buffer: Buffer;
    fileName: string;
    folder?: string;
    mimeType?: string;
  }): Promise<UploadImagekitResponse> {
    const response = await this.imagekit.upload({
      file: payload.buffer.toString('base64'),
      fileName: payload.fileName,
      folder: `${ROOT_DIR}/${payload.folder ?? 'uploads'}`,
      useUniqueFileName: false,
    });

    return this.toUploadResponse(response);
  }

  getDirectUploadAuthentication(params?: {
    token?: string;
    expireInSeconds?: number;
  }): {
    token: string;
    expire: number;
    signature: string;
    publicKey: string;
    uploadEndpoint: string;
  } {
    const config = this.configService.get<ImagekitConfig>('imagekit');
    if (!config) {
      throw new Error('ImageKit config not found');
    }

    const expire =
      Math.floor(Date.now() / 1000) +
      Math.max(60, params?.expireInSeconds ?? 600);
    const auth = this.imagekit.getAuthenticationParameters(
      params?.token,
      expire,
    );

    return {
      token: auth.token,
      expire: auth.expire,
      signature: auth.signature,
      publicKey: config.publicKey,
      uploadEndpoint: 'https://upload.imagekit.io/api/v1/files/upload',
    };
  }

  async deleteFileByUrl(payload: DeleteImagekitRequest): Promise<boolean> {
    const urlObj = new URL(payload.url);
    const filePath = urlObj.pathname.replace(/^\//, '');
    const fileName = filePath.split('/').pop() ?? '';

    const files = await this.imagekit.listFiles({
      name: fileName,
      limit: 1,
    });

    if (!files.length) {
      return false;
    }

    const file = files[0];
    if ('fileId' in file) {
      await this.imagekit.deleteFile(file.fileId);
      return true;
    }

    return false;
  }

  async listFilesInFolder(folder: string) {
    const files = await this.imagekit.listFiles({
      path: `/${ROOT_DIR}/${folder}`,
      limit: 100,
    });

    return files.map((f: any) => ({
      url: f.url,
      fileId: f.fileId,
      name: f.name,
      fileType: f.fileType,
      mime: f.mime || '',
    }));
  }
}
