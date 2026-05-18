import { registerAs } from '@nestjs/config';
import { PostgresConfig } from '@common/types/postgre-config.type';

export default registerAs<PostgresConfig>('postgres', () => ({
  host: process.env.POSTGRE_DATABASE_HOST || 'localhost',
  port: parseInt(process.env.POSTGRE_DATABASE_PORT || '5432', 10),
  username: process.env.POSTGRE_DATABASE_USERNAME || 'postgres',
  password: process.env.POSTGRE_DATABASE_PASSWORD || '12345',
  database: process.env.POSTGRE_DATABASE_NAME || 'iccp_be_core',
  synchronize: process.env.POSTGRE_DATABASE_SYNCHRONIZE === 'true',
  ssl:
    process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
  extra:
    process.env.POSTGRES_SSL === 'true' ? { sslmode: 'require' } : undefined,
}));
