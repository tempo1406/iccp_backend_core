import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '@common/decorators/role/role.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    try {
      const requiredRoles = this.reflector.getAllAndOverride<string[]>(
        ROLES_KEY,
        [context.getHandler(), context.getClass()],
      );
      if (!requiredRoles) return true;

      const { user } = context.switchToHttp().getRequest();
      const userRoles = Array.isArray(user?.role)
        ? (user.role as string[])
        : [user?.role as string].filter(Boolean);
      const isRoleValid = requiredRoles.some((role) =>
        userRoles.includes(role),
      );
      if (!isRoleValid) {
        throw new ForbiddenException('User does not have the required role');
      }
      return true;
    } catch (error) {
      console.error('Error checking roles:', error);
      throw error;
    }
  }
}
