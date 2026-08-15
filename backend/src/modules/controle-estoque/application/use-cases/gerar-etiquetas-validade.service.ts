import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import {
  LABEL_PRINTER_PORT,
  LabelPrinterPort,
  EtiquetaValidade,
} from '@/modules/controle-estoque/domain/repositories/label-printer.port';
import {
  ETIQUETA_LAYOUT_REPOSITORY_PORT,
  EtiquetaLayoutRepositoryPort,
} from '@/modules/controle-estoque/domain/repositories/etiqueta-layout-repository.port';
import {
  DEFAULT_ETIQUETA_LAYOUT,
  EtiquetaLayoutConfig,
  sanitizeEtiquetaLayout,
} from './etiqueta-layout-defaults';

@Injectable()
export class GerarEtiquetasValidadeService {
  constructor(
    @Inject(LABEL_PRINTER_PORT)
    private readonly printer: LabelPrinterPort,
    @Inject(ETIQUETA_LAYOUT_REPOSITORY_PORT)
    private readonly layoutRepo: EtiquetaLayoutRepositoryPort,
  ) {}

  async print(data: EtiquetaValidade): Promise<{ impressas: number }> {
    if (data.quantidade < 1 || data.quantidade > 100) {
      throw new BadRequestException('Quantidade deve ser entre 1 e 100.');
    }

    const layout = await this.getLayout();
    const zpl = this.buildZpl(data, layout);
    await this.printer.print(zpl);

    return { impressas: data.quantidade };
  }

  async status(): Promise<{ online: boolean }> {
    const online = await this.printer.isConnected();
    return { online };
  }

  // ── Layout configurável ──────────────────────────────────────────────────────

  async getLayout(): Promise<EtiquetaLayoutConfig> {
    const saved = await this.layoutRepo.find();
    return sanitizeEtiquetaLayout(saved ?? {});
  }

  async saveLayout(partial: Partial<EtiquetaLayoutConfig>): Promise<EtiquetaLayoutConfig> {
    const current = await this.getLayout();
    const next = sanitizeEtiquetaLayout({ ...current, ...partial });
    await this.layoutRepo.save(next);
    return next;
  }

  async resetLayout(): Promise<EtiquetaLayoutConfig> {
    await this.layoutRepo.save(DEFAULT_ETIQUETA_LAYOUT);
    return { ...DEFAULT_ETIQUETA_LAYOUT };
  }

  /** Imprime uma única etiqueta de teste com um layout ainda não salvo (ajuste ao vivo). */
  async testPrint(data: EtiquetaValidade, layoutOverride?: Partial<EtiquetaLayoutConfig>): Promise<void> {
    const base = await this.getLayout();
    const layout = sanitizeEtiquetaLayout({ ...base, ...layoutOverride });
    const zpl = this.buildZpl({ ...data, quantidade: 1 }, layout);
    await this.printer.print(zpl);
  }

  // ── ZPL para Elgin L42 Pro Full — etiqueta BOPP branco 60×30 mm (203 dpi) ──
  // Largura: 60 mm × 8 dots/mm = 480 dots
  // Altura:  30 mm × 8 dots/mm = 240 dots
  private buildZpl(d: EtiquetaValidade, layout: EtiquetaLayoutConfig): string {
    const s = (v: string) => this.normalize(v);
    const L = layout;

    const x0 = L.marginLeft + L.offsetX;
    const contentWidth = Math.max(1, 480 - L.marginLeft - L.marginRight);
    const xSif = x0 + Math.round(contentWidth * 0.6);
    const separatorWidth = contentWidth;

    let y = L.marginTop + L.offsetY;
    const lines: string[] = [
      '^XA',
      '^PW480',           // largura 60 mm
      '^LL240',           // altura 30 mm
      '^LH0,0',
      '^CI28',            // UTF-8

      // Borda — acompanha o offset global (drift de calibração do sensor)
      `^FO${2 + L.offsetX},${2 + L.offsetY}^GB476,236,2^FS`,
    ];

    // Linha 1 — Produto (bold, destaque)
    lines.push(`^FO${x0},${y}^A0N,${L.fontSizeProduto},${L.fontSizeProduto}^FD${s(d.produto)}^FS`);
    y += L.fontSizeProduto + L.lineGap;

    // Separador
    lines.push(`^FO${x0},${y}^GB${separatorWidth},1,1^FS`);
    y += L.lineGap;

    // Linha 2 — Fabricante + SIF
    lines.push(`^FO${x0},${y}^A0N,${L.fontSizeInfo},${L.fontSizeInfo}^FDFab: ${s(d.fabricante)}^FS`);
    lines.push(`^FO${xSif},${y}^A0N,${L.fontSizeInfo},${L.fontSizeInfo}^FDSIF: ${s(d.sif)}^FS`);
    y += L.fontSizeInfo + L.lineGap;

    // Linha 3 — Lote
    lines.push(`^FO${x0},${y}^A0N,${L.fontSizeInfo},${L.fontSizeInfo}^FDLote: ${s(d.lote)}^FS`);
    y += L.fontSizeInfo + L.lineGap;

    // Linha 4 — Manipulação
    lines.push(`^FO${x0},${y}^A0N,${L.fontSizeInfo},${L.fontSizeInfo}^FDManip.: ${s(d.dataManip)}^FS`);
    y += L.fontSizeInfo + L.lineGap;

    // Separador
    lines.push(`^FO${x0},${y}^GB${separatorWidth},1,1^FS`);
    y += L.lineGap;

    // Linha 5 — Validade (destaque máximo)
    lines.push(`^FO${x0},${y}^A0N,${L.fontSizeValidade},${L.fontSizeValidade}^FDVALIDADE: ${s(d.dataValidade)}^FS`);
    y += L.fontSizeValidade + L.lineGap;

    // Separador
    lines.push(`^FO${x0},${y}^GB${separatorWidth},1,1^FS`);
    y += L.lineGap;

    // Linha 6 — Responsável
    lines.push(`^FO${x0},${y}^A0N,${L.fontSizeResponsavel},${L.fontSizeResponsavel}^FDResp.: ${s(d.responsavel)}^FS`);

    // Quantidade de cópias
    lines.push(`^PQ${d.quantidade}`);
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
