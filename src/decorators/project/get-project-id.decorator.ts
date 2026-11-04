import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetProjectId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.params?.projectId as string | undefined;
  },
);
