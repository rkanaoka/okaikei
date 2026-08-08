import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import {
  LABEL_PRINTER_PORT,
  LabelPrinterPort,
  EtiquetaValidade,
} from '@/modules/controle-estoque/domain/repositories/label-printer.port';

@Injectable()
export class GerarEtiquetasValidadeService {
  constructor(
    @Inject(LABEL_PRINTER_PORT)
    private readonly printer: LabelPrinterPort,
  ) {}

  async print(data: EtiquetaValidade): Promise<{ impressas: number }> {
    if (data.quantidade < 1 || data.quantidade > 100) {
      throw new BadRequestException('Quantidade deve ser entre 1 e 100.');
    }

    const zpl = this.buildZpl(data);
    await this.printer.print(zpl);

    return { impressas: data.quantidade };
  }

  async status(): Promise<{ online: boolean }> {
    const online = await this.printer.isConnected();
    return { online };
  }

  // ── ZPL para Elgin L42 Pro Full — etiqueta BOPP branco 60×30 mm (203 dpi) ──
  // Largura: 60 mm × 8 dots/mm = 480 dots
  // Altura:  30 mm × 8 dots/mm = 240 dots
  private buildZpl(d: EtiquetaValidade): string {
    const s = (v: string) => this.normalize(v);

    return [
      '^XA',
      '^PW480',           // largura 60 mm
      '^LL240',           // altura 30 mm
      '^LH0,0',
      '^CI28',            // UTF-8

      // Borda
      '^FO2,2^GB476,236,2^FS',

      // Linha 1 — Produto (bold, destaque)
      `^FO10,8^A0N,20,20^FD${s(d.produto)}^FS`,

      // Separador
      '^FO10,32^GB460,1,1^FS',

      // Linha 2 — Fabricante + SIF
      `^FO10,36^A0N,13,13^FDFab: ${s(d.fabricante)}^FS`,
      `^FO290,36^A0N,13,13^FDSIF: ${s(d.sif)}^FS`,

      // Linha 3 — Lote
      `^FO10,52^A0N,13,13^FDLote: ${s(d.lote)}^FS`,

      // Linha 4 — Manipulação
      `^FO10,68^A0N,13,13^FDManip.: ${s(d.dataManip)}^FS`,

      // Separador
      '^FO10,85^GB460,1,1^FS',

      // Linha 5 — Validade (destaque máximo)
      `^FO10,91^A0N,26,26^FDVALIDADE: ${s(d.dataValidade)}^FS`,

      // Separador
      '^FO10,122^GB460,1,1^FS',

      // Linha 6 — Responsável
      `^FO10,127^A0N,12,12^FDResp.: ${s(d.responsavel)}^FS`,

      // Quantidade de cópias
      `^PQ${d.quantidade}`,
      '^XZ',
    ].join('\n');
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
