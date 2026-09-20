import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { InsumosService } from '@/modules/controle-estoque/application/use-cases/insumos.service';
import { UNIDADES_MEDIDA } from '@/modules/controle-estoque/domain/value-objects/unidade-conversao';

@Controller('estoque/insumos')
export class InsumosController {
  constructor(private readonly insumos: InsumosService) {}

  // ── Unidades de medida (declarada antes de ':id' para não colidir na rota) ──

  @Get('unidades-medida')
  unidadesMedida() {
    return UNIDADES_MEDIDA;
  }

  // ── Insumos ──────────────────────────────────────────────────────────────────

  @Get()
  findAll(@Query('all') all?: string) {
    return this.insumos.list(all === 'true');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.insumos.findOne(id);
  }

  @Post()
  create(@Body() body: {
    name: string; categoria?: string; categoriaId?: string | null; subcategoriaId?: string | null;
    unidadeBase: 'MG' | 'ML' | 'UN'; estoqueMinimo?: number;
  }) {
    return this.insumos.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: Partial<{
    name: string; categoria: string | null; categoriaId: string | null; subcategoriaId: string | null;
    estoqueMinimo: number | null; active: boolean;
  }>) {
    return this.insumos.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.insumos.remove(id);
  }

  // ── Itens de fornecedor (marca/embalagem de compra) ──────────────────────────

  @Post(':id/fornecedores')
  addFornecedorItem(@Param('id') id: string, @Body() body: any) {
    return this.insumos.addFornecedorItem(id, body);
  }

  @Put('fornecedores/:fornecedorItemId')
  updateFornecedorItem(@Param('fornecedorItemId') id: string, @Body() body: any) {
    return this.insumos.updateFornecedorItem(id, body);
  }

  @Delete('fornecedores/:fornecedorItemId')
  removeFornecedorItem(@Param('fornecedorItemId') id: string) {
    return this.insumos.removeFornecedorItem(id);
  }

  // ── Entrada manual de estoque ─────────────────────────────────────────────────

  @Post(':id/entrada')
  registrarEntrada(@Param('id') id: string, @Body() body: any) {
    return this.insumos.registrarEntradaManual(id, body);
  }
}
