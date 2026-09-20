import { Controller, Get, Post, Put, Param, Body, Query } from '@nestjs/common';
import { InsumoCategoriasService } from '@/modules/controle-estoque/application/use-cases/insumo-categorias.service';

@Controller('estoque/categorias')
export class InsumoCategoriasController {
  constructor(private readonly categorias: InsumoCategoriasService) {}

  @Get()
  findAll(@Query('all') all?: string) {
    return this.categorias.list(all === 'true');
  }

  @Post()
  create(@Body() body: { nome: string }) {
    return this.categorias.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.categorias.update(id, body);
  }

  @Post(':categoriaId/subcategorias')
  createSubcategoria(@Param('categoriaId') categoriaId: string, @Body() body: { nome: string }) {
    return this.categorias.createSubcategoria(categoriaId, body);
  }

  @Put('subcategorias/:id')
  updateSubcategoria(@Param('id') id: string, @Body() body: any) {
    return this.categorias.updateSubcategoria(id, body);
  }
}
