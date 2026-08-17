import { CanActivate, ExecutionContext, Injectable, SetMetadata, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtPayload } from '@/modules/auth/infrastructure/guards/jwt-auth.guard';

export const PERMISSION_KEY = 'requiredPermission';
export const RequirePermission = (permission: string) => SetMetadata(PERMISSION_KEY, permission);

// Deve ser usado sempre depois de JwtAuthGuard — depende de req.user já populado.
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string | undefined>(PERMISSION_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!required) return true;

    const user: JwtPayload = ctx.switchToHttp().getRequest().user;
    if (user.role === 'ADMIN' || user.permissions.includes(required)) return true;

    throw new ForbiddenException('Sem permissão para acessar este recurso.');
  }
}
