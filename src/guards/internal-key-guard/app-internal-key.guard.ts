import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * App-config based internal key guard.
 *
 * Uses config namespace `app.internalApiKey`.
 */
@Injectable()
export class AppInternalKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    const key = req.headers['x-internal-key'] as string | undefined;
    const expected = this.config.get<string>('app.internalApiKey');

    if (!key || !expected || key !== expected) {
      throw new UnauthorizedException('Invalid internal key');
    }

    return true;
  }
}
