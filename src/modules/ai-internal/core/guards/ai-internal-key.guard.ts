import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class AiInternalKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const key = req.headers['x-internal-key'] as string | undefined;
    const expected = this.config.get<string>('app.internalApiKey');

    if (!key || !expected || key !== expected) {
      throw new UnauthorizedException('Invalid internal key');
    }

    return true;
  }
}
