import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Socket } from 'socket.io';
import { AuthJwtPayload } from '@modules/auth/types/auth-jwt.payload';

/** Lấy toàn bộ JWT payload từ socket.data.user */
export const WsCurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthJwtPayload =>
    ctx.switchToWs().getClient<Socket>().data.user as AuthJwtPayload,
);

/** Shortcut lấy userId (JWT sub) */
export const WsUserId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string =>
    ctx.switchToWs().getClient<Socket>().data.userId as string,
);
