import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Legacy guard for service-to-service endpoints.
 *
 * Uses direct env key lookup (INTERNAL_API_KEY) to preserve old behavior
 * for existing endpoints that already depend on this contract.
 */
@Injectable()
export class LegacyInternalKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const internalKey = (request.headers as any)['x-internal-key'] as
      | string
      | undefined;

    const expectedKey = this.configService.get<string>('INTERNAL_API_KEY');
    if (!expectedKey) {
      throw new ForbiddenException('Internal API key not configured');
    }

    if (!internalKey || internalKey !== expectedKey) {
      throw new ForbiddenException('Invalid or missing X-Internal-Key header');
    }

    return true;
  }
}
