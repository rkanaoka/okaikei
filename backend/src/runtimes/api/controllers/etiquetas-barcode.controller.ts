import { Controller, Post, Put, Get, Body, BadRequestException } from '@nestjs/common';
import { GerarEtiquetasBarcodeService, ItemImpressaoBarcode } from '@/modules/controle-estoque/application/use-cases/gerar-etiquetas-barcode.service';
import { EtiquetaBarcodeLayoutConfig } from '@/modules/controle-estoque/application/use-cases/etiqueta-barcode-layout-defaults';

@Controller('estoque/etiquetas/codigo-barras')
export class EtiquetasBarcodeController {
  constructor(private readonly service: GerarEtiquetasBarcodeService) {}

  /** Retorna o layout de impressão atual (posicionamento, margens, tamanho da fonte, barcode). */
  @Get('layout')
  getLayout() {
    return this.service.getLayout();
  }

  /** Salva o layout de impressão. */
  @Put('layout')
  saveLayout(@Body() body: Partial<EtiquetaBarcodeLayoutConfig>) {
    return this.service.saveLayout(body);
  }

  /** Restaura o layout de impressão para os valores padrão. */
  @Post('layout/reset')
  resetLayout() {
    return this.service.resetLayout();
  }

  /** Imprime uma única etiqueta de teste com um layout ainda não salvo. */
  @Post('layout/test')
  async testLayout(@Body() body: { nome: string; codigoBarras: string; layout?: Partial<EtiquetaBarcodeLayoutConfig> }) {
    if (!body.nome?.trim()) throw new BadRequestException('Nome é obrigatório.');
    if (!body.codigoBarras?.trim()) throw new BadRequestException('Código de barras é obrigatório.');
    try {
      await this.service.testPrint(body.nome, body.codigoBarras, body.layout);
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  /** Imprime etiquetas de código de barras para múltiplos insumos. Body: { itens: [{ insumoId, quantidade }] } */
  @Post('print')
  print(@Body() body: { itens: ItemImpressaoBarcode[] }) {
    return this.service.print(body.itens);
  }
}
