import { ImagekitConfig } from '@common/types/imagekit-config.type';
import { ConfigService } from '@nestjs/config';
import type ImageKit from 'imagekit';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ImageKitClass = require('imagekit') as new (opts: {
  publicKey: string;
  privateKey: string;
  urlEndpoint: string;
}) => ImageKit;

export const ImageKitProvider = {
  provide: 'IMAGEKIT',
  inject: [ConfigService],
  useFactory: (configService: ConfigService): ImageKit => {
    const config = configService.get<ImagekitConfig>('imagekit');
    if (!config) {
      throw new Error('ImageKit config not found');
    }

    return new ImageKitClass({
      publicKey: config.publicKey,
      privateKey: config.privateKey,
      urlEndpoint: config.urlEndpoint,
    });
  },
};
