import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '@/modules/auth/infrastructure/guards/jwt-auth.guard';

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): JwtPayload => {
  return ctx.switchToHttp().getRequest().user;
});
