import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { UsersService } from '@/modules/auth/application/use-cases/users.service';
import { JwtAuthGuard } from '@/modules/auth/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermission } from '@/modules/auth/infrastructure/guards/permissions.guard';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission('configuracoes')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list() {
    return this.users.listAll();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: { active?: boolean; adminPermissions?: string[] }) {
    return this.users.updatePermissions(id, body);
  }
}
