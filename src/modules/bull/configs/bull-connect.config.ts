import { ConfigService } from '@nestjs/config';
import { BullConnectionSingleton } from '../bullmq.connection';

export const bullConnectConfig = (configService: ConfigService) => {
  const connection = BullConnectionSingleton.getInstance(configService);
  return {
    connection,
  };
};
