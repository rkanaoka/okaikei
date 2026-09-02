import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { GarconsService } from '@/modules/ponto-de-venda/application/use-cases/garcons.service';
import { JwtAuthGuard } from '@/modules/auth/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermission } from '@/modules/auth/infrastructure/guards/permissions.guard';

@Controller('garcons')
export class GarconsController {
  constructor(private readonly garcons: GarconsService) {}

  // Usado pela tela de Caixa ao fechar a comanda — sem guard de permissão de admin,
  // qualquer operador do caixa precisa poder identificar o garçom pelo código.
  @Get('by-code/:code')
  findByCode(@Param('code') code: string) {
    return this.garcons.findByCode(code);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('configuracoes')
  list() {
    return this.garcons.list();
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('configuracoes')
  create(@Body() body: { name: string; userId?: string | null }) {
    return this.garcons.create(body);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('configuracoes')
  update(@Param('id') id: string, @Body() body: { name?: string; userId?: string | null; active?: boolean }) {
    return this.garcons.update(id, body);
  }
}
