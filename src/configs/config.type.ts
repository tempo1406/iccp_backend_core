import { AppConfig } from '../common/types/app-config.type';
import { PostgresConfig } from '../common/types/postgre-config.type';
import { RedisConfig } from '../common/types/redis-config.type';
import { AuthConfig } from '../common/types/auth-config.type';
import { MailConfig } from '../common/types/mail-config.type';
import { ApidocsConfig } from '../common/types/api-docs-config.type';
import { ImagekitConfig } from '../common/types/imagekit-config.type';

export type AllConfigType = {
  app: AppConfig;
  postgres: PostgresConfig;
  redis: RedisConfig;
  auth: AuthConfig;
  mail: MailConfig;
  apiDocs: ApidocsConfig;
  imagekit: ImagekitConfig;
};
