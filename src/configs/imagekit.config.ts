import { registerAs } from '@nestjs/config';
import validateConfig from '@utils/validate-config';

import { IsString } from 'class-validator';
import { ImagekitConfig } from '../common/types/imagekit-config.type';

class EnvironmentVariablesValidator {
  @IsString()
  IMAGEKIT_PUBLIC_KEY: string;

  @IsString()
  IMAGEKIT_PRIVATE_KEY: string;

  @IsString()
  IMAGEKIT_URL_ENDPOINT: string;
}

export default registerAs<ImagekitConfig>('imagekit', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY!,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT!,
  };
});
