import { PERMISSION_KEY } from '@common/decorators/role/require-permission.decorator';
import {
  ORGANIZATION_HEADERS,
  validateOrganizationId,
} from 'src/decorators/organization/get-org-id.decorator';
import { RbacService } from '@modules/rbac/rbac.service';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

const headers = {
  X_ORGANIZATION_ID: ORGANIZATION_HEADERS.X_ORGANIZATION_ID,
};

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Lấy permissions yêu cầu từ decorator
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Nếu không có permissions yêu cầu, return true
    if (!requiredPermissions?.length) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user; // do JwtAuthGuard đã inject vào
    if (!user)
      throw new UnauthorizedException('Access token is invalid or expired');

    const userId = (user.userId || user.sub) as string | undefined;
    if (!userId) return false;

    const organizationId = validateOrganizationId(
      request.headers[headers.X_ORGANIZATION_ID] ||
        request.params?.organizationId,
      headers.X_ORGANIZATION_ID,
    );

    for (const perCode of requiredPermissions) {
      const allowed = await this.rbacService.hasPermission(
        user.sub as string,
        perCode,
        organizationId as string,
      );
      if (!allowed)
        throw new ForbiddenException(
          'You are not authorized to access this resource: ' + perCode,
        );
    }

    return true;
  }
}
