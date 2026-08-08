import { Controller, Post, Get, Body, BadRequestException } from '@nestjs/common';
import { GerarEtiquetasValidadeService }  from '@/modules/controle-estoque/application/use-cases/gerar-etiquetas-validade.service';
import { EtiquetaValidade }               from '@/modules/controle-estoque/domain/repositories/label-printer.port';

@Controller('estoque/etiquetas')
export class EtiquetasController {
  constructor(private readonly service: GerarEtiquetasValidadeService) {}

  /** Retorna se a impressora de etiquetas está online. */
  @Get('status')
  status() {
    return this.service.status();
  }

  /**
   * Imprime etiquetas de validade.
   * Body: EtiquetaValidade (produto, fabricante, lote, sif, dataManip, dataValidade, responsavel, quantidade)
   */
  @Post('print')
  async print(@Body() body: EtiquetaValidade) {
    if (!body.produto?.trim())      throw new BadRequestException('Produto é obrigatório.');
    if (!body.fabricante?.trim())   throw new BadRequestException('Fabricante é obrigatório.');
    if (!body.lote?.trim())         throw new BadRequestException('Lote é obrigatório.');
    if (!body.sif?.trim())          throw new BadRequestException('SIF é obrigatório.');
    if (!body.dataManip?.trim())    throw new BadRequestException('Data de manipulação é obrigatória.');
    if (!body.dataValidade?.trim()) throw new BadRequestException('Data de validade é obrigatória.');
    if (!body.responsavel?.trim())  throw new BadRequestException('Responsável é obrigatório.');

    const qty = Number(body.quantidade);
    if (!qty || qty < 1 || qty > 100) {
      throw new BadRequestException('Quantidade deve ser entre 1 e 100.');
    }

    return this.service.print({ ...body, quantidade: qty });
  }
}
