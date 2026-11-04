import 'dotenv/config';
import { NestFactory, Reflector } from '@nestjs/core';
import {
  initializeTransactionalContext,
  addTransactionalDataSource,
} from 'typeorm-transactional';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';
import { AppModule } from './app.module';
import helmet from 'helmet';
import * as compression from 'compression';
import {
  ClassSerializerInterceptor,
  ExceptionFilter,
  NestInterceptor,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import * as morgan from 'morgan';
import { ConfigService } from '@nestjs/config';
import { useContainer } from 'class-validator';
import { AllConfigType } from '@configs/config.type';
import validationOptions from '@utils/validation-option';
import { ResolvePromisesInterceptor } from '@utils/serializer.interceptor';
import { GlobalExceptionFilter } from '@common/filters/global-exception.filter';
import { DataSource } from 'typeorm';
import { configSwagger } from '@configs/swagger.config';
import { runSeeds } from '@database/seeds';
import { WebsocketAdapter } from '@modules/websocket/websocket.adapter';

async function bootstrap() {
  initializeTransactionalContext();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
  });

  useContainer(app.select(AppModule), { fallbackOnErrors: true });
  const dataSource = app.get(DataSource);
  addTransactionalDataSource(dataSource);
  await dataSource.runMigrations();
  await runSeeds(dataSource);

  const configService = app.get(ConfigService<AllConfigType>);
  const reflector = app.get(Reflector);

  // enable shutdown hooks to gracefully shutdown the app
  app.enableShutdownHooks();

  // only if you're behind a reverse proxy (Heroku, Bluemix, AWS ELB, Nginx, ...)
  app.enable('trust proxy');

  // private headers
  app.use(helmet());

  // compression payload
  app.use(compression());

  // increase body size limit for rich-content payloads (e.g. TipTap with base64 images)
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ limit: '20mb', extended: true }));

  // log all requests
  app.use(morgan('combined'));

  // add prefix api to all routes, ignore root route + monitoring endpoints
  app.setGlobalPrefix(
    configService.getOrThrow('app.apiPrefix', { infer: true }),
    {
      exclude: ['/', 'health', 'metrics'],
    },
  );

  // add versioning to all routes
  app.enableVersioning({
    type: VersioningType.URI,
  });

  // global exception filter
  app.useGlobalFilters(
    new GlobalExceptionFilter(configService) as unknown as ExceptionFilter,
  );

  // auto validate DTO base on decorator
  app.useGlobalPipes(new ValidationPipe(validationOptions));

  // resolve promises in responses
  app.useGlobalInterceptors(
    // ResolvePromisesInterceptor is used to resolve promises in responses because class-transformer can't do it
    // https://github.com/typestack/class-transformer/issues/549
    new ResolvePromisesInterceptor() as NestInterceptor,
    new ClassSerializerInterceptor(reflector),
  );

  // config swagger
  configSwagger(app);

  // websocket adapter (socket.io)
  app.useWebSocketAdapter(new WebsocketAdapter(app));

  // TODO: Remove this in production, config cho mấy ae fe test trước đã
  app.enableCors({
    origin: '*',
    methods: 'GET,POST,PUT,DELETE,PATCH',
    credentials: true,
  });

  const port =
    process.env.PORT || configService.getOrThrow('app.port', { infer: true });
  await app.listen(port, '0.0.0.0');
}
void bootstrap();
