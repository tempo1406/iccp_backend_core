import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthJwtPayload } from '../types/auth-jwt.payload';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // check if the token is in the body (websocket request)
        (req: any) => {
          // HTTP request
          if (req?.headers?.authorization?.startsWith('Bearer ')) {
            return req.headers.authorization.slice(7) as string;
          }

          // accept websocket get handlershake.headers
          const authHeader = req?.handshake?.headers?.authorization;

          if (authHeader?.startsWith('Bearer ')) {
            return authHeader.split(' ')[1] as string;
          }

          // accept websocket handshake.query.token
          if (req?.handshake?.query?.accessToken) {
            return req?.handshake?.query?.accessToken as string;
          }

          // accept websocket handshake.query.accessToken from object
          if (req?.handshake?.authHeader?.accessToken) {
            return req.handshake.authHeader.accessToken as string;
          }
          return null;
        },
      ]),
      secretOrKey: configService.get('jwt.secret') as string,
      ignoreExpiration: false,
    });
  }

  validate(payload: AuthJwtPayload) {
    const roles = Array.isArray(payload.role) ? payload.role : [payload.role];
    return {
      sub: payload.sub, // dùng cho PermissionGuard
      userId: payload.sub, // alias
      role: roles, // dùng cho RolesGuard
    };
  }
}
