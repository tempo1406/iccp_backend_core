import { registerAs } from '@nestjs/config';
import validateConfig from '@utils/validate-config';
import { IsString } from 'class-validator';

export interface PayosConfig {
  clientId: string;
  apiKey: string;
  checksumKey: string;
  returnUrl: string;
  cancelUrl: string;
}

class EnvironmentVariablesValidator {
  @IsString()
  PAYOS_CLIENT_ID: string;

  @IsString()
  PAYOS_API_KEY: string;

  @IsString()
  PAYOS_CHECKSUM_KEY: string;

  @IsString()
  FRONTEND_DOMAIN: string;
}

export default registerAs<PayosConfig>('payos', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  const frontendDomain = process.env.FRONTEND_DOMAIN!.replace(/\/$/, '');

  return {
    clientId: process.env.PAYOS_CLIENT_ID!,
    apiKey: process.env.PAYOS_API_KEY!,
    checksumKey: process.env.PAYOS_CHECKSUM_KEY!,
    returnUrl: `${frontendDomain}/payment/success`,
    cancelUrl: `${frontendDomain}/payment/cancel`,
  };
});
