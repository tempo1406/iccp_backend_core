import { UserResponse } from '@modules/users/dto/response/user.response';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext): UserResponse | any => {
    const request = ctx.switchToHttp().getRequest();
    const user: UserResponse = request.user;
    if (!user) return undefined;
    if (!data) return user;
    return (user as any)[data];
  },
);
