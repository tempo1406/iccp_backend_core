import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplicationContext } from '@nestjs/common';
import { ServerOptions } from 'socket.io';

export class WebsocketAdapter extends IoAdapter {
  constructor(app: INestApplicationContext) {
    super(app);
  }

  override createIOServer(port: number, options?: ServerOptions) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return super.createIOServer(port, {
      ...options,
      cors: {
        origin: true,
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });
  }

  // override createIOServer(port: number, options?: ServerOptions) {
  //   const corsOrigin = process.env.CORS_ORIGIN?.split(',') ?? [
  //     'http://localhost:3000',
  //   ];

  //   // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  //   return super.createIOServer(port, {
  //     ...options,
  //     cors: { origin: corsOrigin, credentials: true },
  //     transports: ['websocket', 'polling'],
  //   });
  // }
}
