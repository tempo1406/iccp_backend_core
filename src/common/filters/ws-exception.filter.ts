import { Catch, ArgumentsHost, Logger } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Catch(WsException)
export class WsExceptionFilter extends BaseWsExceptionFilter {
  private readonly logger = new Logger(WsExceptionFilter.name);

  catch(exception: WsException, host: ArgumentsHost): void {
    const client = host.switchToWs().getClient<Socket>();
    const error = exception.getError();
    const response =
      typeof error === 'object' ? error : { statusCode: 400, message: error };

    this.logger.warn(`[${client.id}]: ${JSON.stringify(response)}`);
    client.emit('exception', response);
  }
}
