import { registerAs } from '@nestjs/config';
import validateConfig from '@utils/validate-config';
import { AuthConfig } from '@common/types/auth-config.type';

import { IsString } from 'class-validator';
import ms from 'ms';

class EnvironmentVariablesValidator {
  @IsString()
  JWT_SECRET: string;

  @IsString()
  JWT_EXPIRE_IN: string;

  @IsString()
  REFRESH_JWT_SECRET: string;

  @IsString()
  REFRESH_JWT_EXPIRE_IN: string;
}

export default registerAs<AuthConfig>('auth', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    secret: process.env.JWT_SECRET,
    expires: process.env.JWT_EXPIRE_IN as ms.StringValue,
    refreshSecret: process.env.REFRESH_JWT_SECRET,
    refreshExpires: process.env.REFRESH_JWT_EXPIRE_IN as ms.StringValue,
  };
});
