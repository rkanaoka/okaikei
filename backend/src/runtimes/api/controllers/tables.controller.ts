import { Controller, Get, Post, Put, Param, Body, UseGuards } from '@nestjs/common';
import { TablesService } from '@/modules/ponto-de-venda/application/use-cases/tables.service';
import { JwtAuthGuard } from '@/modules/auth/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermission } from '@/modules/auth/infrastructure/guards/permissions.guard';

@Controller('tables')
export class TablesController {
  constructor(private readonly tables: TablesService) {}

  // Sem guard — usado pela tela de Garçom (chão de loja) pra listar mesas
  @Get()
  findAll() { return this.tables.findAll(); }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('configuracoes')
  create(@Body() b: { type: string; number: number; capacity?: number }) { return this.tables.create(b); }

  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('configuracoes')
  update(@Param('id') id: string, @Body() b: { type?: string; number?: number; capacity?: number }) { return this.tables.update(id, b); }
}
