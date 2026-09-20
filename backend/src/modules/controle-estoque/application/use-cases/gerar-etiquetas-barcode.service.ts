import { Inject, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { LABEL_PRINTER_PORT, LabelPrinterPort } from '@/modules/controle-estoque/domain/repositories/label-printer.port';
import {
  ETIQUETA_LAYOUT_REPOSITORY_PORT, EtiquetaLayoutRepositoryPort,
} from '@/modules/controle-estoque/domain/repositories/etiqueta-layout-repository.port';
import { INSUMO_REPOSITORY_PORT, InsumoRepositoryPort } from '@/modules/controle-estoque/domain/repositories/insumo-repository.port';
import {
  ETIQUETA_BARCODE_LAYOUT_CONFIG_KEY,
  DEFAULT_ETIQUETA_BARCODE_LAYOUT,
  EtiquetaBarcodeLayoutConfig,
  sanitizeEtiquetaBarcodeLayout,
} from './etiqueta-barcode-layout-defaults';

export interface ItemImpressaoBarcode {
  insumoId: string;
  quantidade: number;
}

@Injectable()
export class GerarEtiquetasBarcodeService {
  constructor(
    @Inject(LABEL_PRINTER_PORT) private readonly printer: LabelPrinterPort,
    @Inject(ETIQUETA_LAYOUT_REPOSITORY_PORT) private readonly layoutRepo: EtiquetaLayoutRepositoryPort,
    @Inject(INSUMO_REPOSITORY_PORT) private readonly insumoRepo: InsumoRepositoryPort,
  ) {}

  /** Imprime, num único job, um bloco de etiqueta por insumo selecionado (^PQ = cópias daquele item). */
  async print(itens: ItemImpressaoBarcode[]): Promise<{ impressas: number }> {
    if (!itens?.length) throw new BadRequestException('Selecione ao menos um insumo para imprimir.');

    const layout = await this.getLayout();
    const blocos: string[] = [];
    let totalEtiquetas = 0;

    for (const item of itens) {
      const quantidade = Number(item.quantidade);
      if (!quantidade || quantidade < 1 || quantidade > 100) {
        throw new BadRequestException('Quantidade deve ser entre 1 e 100 para cada insumo selecionado.');
      }
      const insumo = await this.insumoRepo.findById(item.insumoId);
      if (!insumo) throw new NotFoundException(`Insumo ${item.insumoId} não encontrado.`);
      if (!insumo.codigoBarras) {
        throw new BadRequestException(`O insumo "${insumo.name}" ainda não possui código de barras gerado.`);
      }
      blocos.push(this.buildZplBloco(insumo.name, insumo.codigoBarras, quantidade, layout));
      totalEtiquetas += quantidade;
    }

    await this.printer.print(blocos.join('\n'));
    return { impressas: totalEtiquetas };
  }

  async status(): Promise<{ online: boolean }> {
    return { online: await this.printer.isConnected() };
  }

  // ── Layout configurável ──────────────────────────────────────────────────────

  async getLayout(): Promise<EtiquetaBarcodeLayoutConfig> {
    const saved = await this.layoutRepo.find(ETIQUETA_BARCODE_LAYOUT_CONFIG_KEY);
    return sanitizeEtiquetaBarcodeLayout(saved ?? {});
  }

  async saveLayout(partial: Partial<EtiquetaBarcodeLayoutConfig>): Promise<EtiquetaBarcodeLayoutConfig> {
    const current = await this.getLayout();
    const next = sanitizeEtiquetaBarcodeLayout({ ...current, ...partial });
    await this.layoutRepo.save(ETIQUETA_BARCODE_LAYOUT_CONFIG_KEY, next);
    return next;
  }

  async resetLayout(): Promise<EtiquetaBarcodeLayoutConfig> {
    await this.layoutRepo.save(ETIQUETA_BARCODE_LAYOUT_CONFIG_KEY, DEFAULT_ETIQUETA_BARCODE_LAYOUT);
    return { ...DEFAULT_ETIQUETA_BARCODE_LAYOUT };
  }

  /** Imprime uma única etiqueta de teste com um layout ainda não salvo (ajuste ao vivo). */
  async testPrint(nome: string, codigoBarras: string, layoutOverride?: Partial<EtiquetaBarcodeLayoutConfig>): Promise<void> {
    const base = await this.getLayout();
    const layout = sanitizeEtiquetaBarcodeLayout({ ...base, ...layoutOverride });
    const zpl = this.buildZplBloco(nome, codigoBarras, 1, layout);
    await this.printer.print(zpl);
  }

  // ── ZPL para Elgin L42 Pro Full — etiqueta BOPP branco 60×30 mm (203 dpi) ──
  // Largura: 60 mm × 8 dots/mm = 480 dots · Altura: 30 mm × 8 dots/mm = 240 dots
  private buildZplBloco(nome: string, codigoBarras: string, quantidade: number, layout: EtiquetaBarcodeLayoutConfig): string {
    const s = (v: string) => this.normalize(v);
    const L = layout;
    const x0 = L.marginLeft + L.offsetX;
    let y = L.marginTop + L.offsetY;

    const lines: string[] = [
      '^XA',
      '^PW480',
      '^LL240',
      '^LH0,0',
      '^CI28',
      `^FO${2 + L.offsetX},${2 + L.offsetY}^GB476,236,2^FS`,
    ];

    // Nome do insumo
    lines.push(`^FO${x0},${y}^A0N,${L.fontSizeNome},${L.fontSizeNome}^FD${s(nome)}^FS`);
    y += L.fontSizeNome + L.lineGap;

    // Código de barras EAN-8 — só os 7 dígitos de dados vão pro ^FD; a impressora
    // calcula e imprime o 8º dígito (verificador) sozinha, que bate com o
    // codigoBarras salvo pois usamos o mesmo algoritmo GS1 para gerá-lo.
    lines.push(`^BY${L.moduleWidth}`);
    lines.push(`^FO${x0},${y}^BEN,${L.barcodeHeight},${L.showCode ? 'Y' : 'N'},N^FD${codigoBarras.slice(0, 7)}^FS`);

    lines.push(`^PQ${quantidade}`);
    lines.push('^XZ');

    return lines.join('\n');
  }

  /** Remove acentos e caracteres especiais não suportados por firmwares ZPL básicos. */
  private normalize(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^\x20-\x7E]/g, '?')
      .trim();
  }
}
