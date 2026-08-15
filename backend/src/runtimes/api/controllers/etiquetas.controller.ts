import { Controller, Post, Get, Put, Body, BadRequestException } from '@nestjs/common';
import { GerarEtiquetasValidadeService }  from '@/modules/controle-estoque/application/use-cases/gerar-etiquetas-validade.service';
import { EtiquetaValidade }               from '@/modules/controle-estoque/domain/repositories/label-printer.port';
import { EtiquetaLayoutConfig }           from '@/modules/controle-estoque/application/use-cases/etiqueta-layout-defaults';

function validateEtiqueta(body: Partial<EtiquetaValidade>) {
  if (!body.produto?.trim())      throw new BadRequestException('Produto é obrigatório.');
  if (!body.fabricante?.trim())   throw new BadRequestException('Fabricante é obrigatório.');
  if (!body.lote?.trim())         throw new BadRequestException('Lote é obrigatório.');
  if (!body.sif?.trim())          throw new BadRequestException('SIF é obrigatório.');
  if (!body.dataManip?.trim())    throw new BadRequestException('Data de manipulação é obrigatória.');
  if (!body.dataValidade?.trim()) throw new BadRequestException('Data de validade é obrigatória.');
  if (!body.responsavel?.trim())  throw new BadRequestException('Responsável é obrigatório.');
}

@Controller('estoque/etiquetas')
export class EtiquetasController {
  constructor(private readonly service: GerarEtiquetasValidadeService) {}

  /** Retorna se a impressora de etiquetas está online. */
  @Get('status')
  status() {
    return this.service.status();
  }

  /** Retorna o layout de impressão atual (posicionamento, margens, tamanhos de fonte). */
  @Get('layout')
  getLayout() {
    return this.service.getLayout();
  }

  /** Salva o layout de impressão. */
  @Put('layout')
  saveLayout(@Body() body: Partial<EtiquetaLayoutConfig>) {
    return this.service.saveLayout(body);
  }

  /** Restaura o layout de impressão para os valores padrão. */
  @Post('layout/reset')
  resetLayout() {
    return this.service.resetLayout();
  }

  /** Imprime uma única etiqueta de teste com um layout ainda não salvo. */
  @Post('layout/test')
  async testLayout(@Body() body: { etiqueta: EtiquetaValidade; layout?: Partial<EtiquetaLayoutConfig> }) {
    validateEtiqueta(body.etiqueta ?? {});
    try {
      await this.service.testPrint(body.etiqueta, body.layout);
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  /**
   * Imprime etiquetas de validade.
   * Body: EtiquetaValidade (produto, fabricante, lote, sif, dataManip, dataValidade, responsavel, quantidade)
   */
  @Post('print')
  async print(@Body() body: EtiquetaValidade) {
    validateEtiqueta(body);

    const qty = Number(body.quantidade);
    if (!qty || qty < 1 || qty > 100) {
      throw new BadRequestException('Quantidade deve ser entre 1 e 100.');
    }

    return this.service.print({ ...body, quantidade: qty });
  }
}
