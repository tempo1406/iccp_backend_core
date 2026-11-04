import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class RefreshTokenGuard extends AuthGuard('jwt-refresh') {
  constructor(
    private readonly jwtService: JwtService,
    private configService: ConfigService,
  ) {
    super();
  }
  handleRequest(err, user, info, context: ExecutionContext): any {
    const request = context.switchToHttp().getRequest();
    // Lấy refresh token từ body
    const { refreshToken } = request.body;
    console.log(123123, refreshToken);

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is missing');
    }

    try {
      this.jwtService.verify(refreshToken as string, {
        secret: this.configService.get<string>('refresh-jwt.secret') as string,
      });
      if (err || !user) {
        throw new UnauthorizedException('Refresh token is invalid or expired');
      }

      return user;
    } catch (error) {
      console.log(error);
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }
  }
}
