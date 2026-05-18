import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetRole = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext): any[] => {
    const request = ctx.switchToHttp().getRequest();
    const role = request.user.role;
    return Array.isArray(role) ? role : [role as string].filter(Boolean);
  },
);
