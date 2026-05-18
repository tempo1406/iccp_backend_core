import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';

@Injectable()
export class TypeOrmConfigService implements TypeOrmOptionsFactory {
  constructor(private configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const isProduction = process.env.NODE_ENV === 'prod';

    return {
      type: 'postgres',
      host: this.configService.get<string>('postgres.host'),
      port: this.configService.get<number>('postgres.port'),
      username: this.configService.get<string>('postgres.username'),
      password: this.configService.get<string>('postgres.password'),
      database: this.configService.get<string>('postgres.database'),
      synchronize: isProduction
        ? false
        : this.configService.get<boolean>('postgres.synchronize'),
      entities: [`${__dirname}/../../modules/**/entities/*.entity{.ts,.js}`],
      migrations: [
        `${__dirname}/../migrations/schemas/*{.ts,.js}`,
        `${__dirname}/../migrations/tables/*{.ts,.js}`,
      ],
      subscribers: [`${__dirname}/../../modules/**/subscribers/*{.ts,.js}`],
      logging: process.env.NODE_ENV === 'development',
      migrationsTableName: 'migrations',
      autoLoadEntities: true,
      ssl: this.configService.get<boolean>('postgres.ssl'),
      extra: this.configService.get<boolean>('postgres.extra'),
    };
  }
}
