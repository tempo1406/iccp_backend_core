/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from '@common/decorators/auth/public.decorator';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // WS auth được xử lý tại BaseGateway.handleConnection — skip tại đây
    if (context.getType() === 'ws') {
      return true;
    }

    // Skip authentication for public endpoints
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }

  handleRequest(err, account, info, context: ExecutionContext) {
    let accessToken: string | undefined;

    // check if http request
    if (context.getType() === 'http') {
      const request = context.switchToHttp().getRequest();
      const authHeader = request.headers?.authorization;
      if (!authHeader) {
        throw new UnauthorizedException('Access token is missing');
      }
      accessToken = authHeader.split(' ')[1] as string;
    }

    // check if websocket request
    if (context.getType() === 'ws') {
      const client = context.switchToWs().getClient();
      const authHeader = client.handshake?.headers?.authorization;
      if (!authHeader) {
        throw new WsException({
          statusCode: 401,
          message: 'Access token is missing (ws)',
        });
      }
      accessToken = authHeader.split(' ')[1] as string;
    }

    if (!accessToken) {
      throw new WsException('Token not found');
    }

    try {
      const decoded = this.jwtService.verify(accessToken, {
        secret: this.configService.get<string>('jwt.secret') as string,
      });

      // Assign user to request or client
      if (context.getType() === 'http') {
        context.switchToHttp().getRequest().user = decoded;
      }
      if (context.getType() === 'ws') {
        context.switchToWs().getClient().user = decoded;
      }

      return decoded;
    } catch (error) {
      console.log(error);
      if (context.getType() === 'ws') {
        throw new WsException({
          statusCode: 401,
          message: 'Access token is invalid or expired',
        });
      } else {
        throw new UnauthorizedException('Access token is invalid or expired');
      }
    }
  }
}
