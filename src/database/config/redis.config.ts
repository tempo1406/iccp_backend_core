import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  username: process.env.REDIS_USERNAME || 'default',
  port: parseInt(process.env.REDIS_DATABASE_PORT || '6379', 10),
  password: process.env.REDIS_DATABASE_PASSWORD || undefined,
  tls: process.env.REDIS_TLS === 'true' || false,
}));
