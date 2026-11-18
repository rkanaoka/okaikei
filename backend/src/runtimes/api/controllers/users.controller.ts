import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
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

  /** Pré-cadastro: a pessoa entra com a conta Google do e-mail informado e já recebe estas permissões. */
  @Post()
  create(@Body() body: { name?: string; email?: string; active?: boolean; adminPermissions?: string[] }) {
    return this.users.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: { name?: string; active?: boolean; adminPermissions?: string[] }) {
    return this.users.updatePermissions(id, body);
  }
}
