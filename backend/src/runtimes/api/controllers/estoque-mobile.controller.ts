import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { InsumosService } from '@/modules/controle-estoque/application/use-cases/insumos.service';
import { ApiKeyGuard } from '@/modules/cardapio-digital/guards/api-key.guard';

/**
 * Endpoints consumidos pelo estoque-app (VPS, via WireGuard) — protegidos por
 * x-api-key (mesmo guard/segredo do cardápio digital). Distinto do
 * InsumosController (uso interno do Admin, sem guard) para não expor o CRUD
 * completo de insumos/fornecedores fora da rede WireGuard.
 */
@Controller('estoque-mobile')
@UseGuards(ApiKeyGuard)
export class EstoqueMobileController {
  constructor(private readonly insumos: InsumosService) {}

  /** GET /estoque-mobile/insumos?q=termo | ?barcode=XXXXXXXX — lista, busca por nome ou código de barras */
  @Get('insumos')
  buscarInsumos(@Query('q') q?: string, @Query('barcode') barcode?: string) {
    return this.insumos.buscar(q, barcode);
  }

  /** GET /estoque-mobile/alertas — insumos com estoqueAtual < estoqueMinimo */
  @Get('alertas')
  alertas() {
    return this.insumos.alertas();
  }

  /** GET /estoque-mobile/movimentacoes?limit=50 — histórico recente de movimentações */
  @Get('movimentacoes')
  movimentacoes(@Query('limit') limit?: string) {
    const parsed = Number(limit);
    return this.insumos.movimentacoesRecentes(Number.isFinite(parsed) && parsed > 0 ? parsed : undefined);
  }

  /** POST /estoque-mobile/contagem — { insumo_id, quantidade } */
  @Post('contagem')
  contagem(@Body() body: { insumo_id: string; quantidade: number }) {
    return this.insumos.registrarContagem(body.insumo_id, body.quantidade);
  }

  /** POST /estoque-mobile/saida — { itens: [{ insumo_id, quantidade }] } */
  @Post('saida')
  saida(@Body() body: { itens: Array<{ insumo_id: string; quantidade: number }> }) {
    return this.insumos.registrarSaida(
      (body.itens ?? []).map((i) => ({ insumoId: i.insumo_id, quantidade: i.quantidade })),
    );
  }
}
