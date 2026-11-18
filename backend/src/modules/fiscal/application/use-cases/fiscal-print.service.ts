import { Inject, Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrintingService } from '@/modules/ponto-de-venda/application/use-cases/printing.service';
import { FISCAL_REPOSITORY_PORT, FiscalRepositoryPort, FiscalDocumentRecord } from '@/modules/fiscal/domain/repositories/fiscal-repository.port';
import { FORMAS_PAGAMENTO_FOCUS } from '@/modules/fiscal/domain/entities/fiscal-settings';
import { FiscalSettingsService } from '@/modules/fiscal/application/use-cases/fiscal-settings.service';
import { FiscalAuditService } from '@/modules/fiscal/application/use-cases/fiscal-audit.service';

const ESC = 0x1b;
const GS  = 0x1d;
const COLS = 32; // mesma largura (58 mm) dos demais tickets do PDV

const CMD = {
  INIT:         Buffer.from([ESC, 0x40]),
  CENTER:       Buffer.from([ESC, 0x61, 0x01]),
  LEFT:         Buffer.from([ESC, 0x61, 0x00]),
  BOLD_ON:      Buffer.from([ESC, 0x45, 0x01]),
  BOLD_OFF:     Buffer.from([ESC, 0x45, 0x00]),
  LF:           Buffer.from([0x0a]),
  CUT:          Buffer.from([GS, 0x56, 0x01]),
};

const noAccent = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const txt = (s: string) => Buffer.from(noAccent(s), 'latin1');
const line = (c = '-') => txt(c.repeat(COLS) + '\n');
const brl = (v: number) => v.toFixed(2).replace('.', ',');
const row = (l: string, r: string) => txt(l.slice(0, COLS - r.length - 1).padEnd(COLS - r.length) + r + '\n');

/** QR Code nativo ESC/POS (GS ( k) — modelo 2, correção M. */
function qrCode(data: string): Buffer {
  const d = Buffer.from(data, 'latin1');
  const len = d.length + 3;
  return Buffer.concat([
    Buffer.from([GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]),            // modelo 2
    Buffer.from([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, 0x05]),                  // tamanho do módulo
    Buffer.from([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31]),                  // correção M
    Buffer.from([GS, 0x28, 0x6b, len & 0xff, (len >> 8) & 0xff, 0x31, 0x50, 0x30]), d, // armazena
    Buffer.from([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]),                  // imprime
  ]);
}

function chaveFormatada(chave: string) {
  return chave.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim();
}

/**
 * DANFE-NFC-e em ESC/POS montado a partir dos dados AUTORIZADOS (chave, protocolo, QR Code da Focus,
 * itens e totais enviados). Reaproveita a impressora do caixa via PrintingService.
 */
@Injectable()
export class FiscalPrintService {
  private readonly logger = new Logger(FiscalPrintService.name);

  constructor(
    @Inject(FISCAL_REPOSITORY_PORT) private readonly repo: FiscalRepositoryPort,
    private readonly printing: PrintingService,
    private readonly settings: FiscalSettingsService,
    private readonly audit: FiscalAuditService,
  ) {}

  async printDocument(documentId: string, actor: string) {
    const doc = await this.repo.findDocumentById(documentId);
    if (!doc) throw new NotFoundException('Documento fiscal não encontrado');
    if (doc.status !== 'AUTORIZADO') throw new BadRequestException('Só é possível imprimir o DANFE-NFC-e de uma nota autorizada');
    if (!doc.chaveNfe || !doc.qrcodeUrl) throw new BadRequestException('Nota sem chave de acesso/QR Code — consulte a nota antes de imprimir');

    try {
      const ticket = await this.build(doc);
      await this.printing.printBuffer('cashier', ticket);
      await this.repo.updateDocument(doc.id, { printedAt: new Date() });
      await this.audit.log({ documentId: doc.id, comandaId: doc.comandaId, action: 'PRINT', actor, success: true });
      return { printed: true };
    } catch (err: any) {
      this.logger.warn(`Falha ao imprimir DANFE-NFC-e (${doc.ref}): ${err.message}`);
      await this.audit.log({ documentId: doc.id, comandaId: doc.comandaId, action: 'PRINT', actor, success: false, detail: { error: err.message } });
      throw new BadRequestException(`Não foi possível imprimir: ${err.message}`);
    }
  }

  private async build(doc: FiscalDocumentRecord): Promise<Buffer> {
    const s = await this.settings.getSettings();
    const req = doc.requestPayload ?? {};
    const resp = doc.responsePayload ?? {};
    const items: any[] = req.items ?? [];
    const pagamentos: any[] = req.formas_pagamento ?? [];

    const bruto = items.reduce((a, i) => a + Number(i.valor_bruto ?? 0), 0);
    const desconto = items.reduce((a, i) => a + Number(i.valor_desconto ?? 0), 0);
    const outras = items.reduce((a, i) => a + Number(i.valor_outras_despesas ?? 0), 0);
    const total = Number(doc.total ?? bruto - desconto + outras);

    const protocolo = doc.protocolo ?? resp?.protocolo_nota_fiscal?.numero_protocolo;
    const dataAut = resp?.protocolo_nota_fiscal?.data_recebimento;
    const contingencia = resp?.contingencia_offline && !resp?.contingencia_offline_efetivada;
    const emissao = req.data_emissao ? new Date(req.data_emissao) : doc.createdAt;
    const fmtData = (d: Date) => d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    const p: Buffer[] = [CMD.INIT, CMD.CENTER, CMD.BOLD_ON, txt(`${s.nomeFantasia || s.razaoSocial}\n`), CMD.BOLD_OFF];
    if (s.razaoSocial && s.nomeFantasia) p.push(txt(`${s.razaoSocial}\n`));
    p.push(txt(`CNPJ: ${s.cnpjEmitente}${s.inscricaoEstadual ? '  IE: ' + s.inscricaoEstadual : ''}\n`));
    if (s.endereco) p.push(txt(`${s.endereco}\n`));
    p.push(line('='), CMD.BOLD_ON, txt('DANFE NFC-e\n'), CMD.BOLD_OFF,
      txt('Documento Auxiliar da Nota Fiscal\nde Consumidor Eletronica\n'));
    if (doc.ambiente === 'homologacao') p.push(CMD.BOLD_ON, txt('EMITIDA EM AMBIENTE DE\nHOMOLOGACAO - SEM VALOR FISCAL\n'), CMD.BOLD_OFF);
    if (contingencia) p.push(CMD.BOLD_ON, txt('EMITIDA EM CONTINGENCIA\nPendente de autorizacao\n'), CMD.BOLD_OFF);
    p.push(line('-'), CMD.LEFT);

    for (const i of items) {
      p.push(txt(`${i.numero_item} ${String(i.descricao).slice(0, COLS - 3)}\n`));
      const detail = `${i.quantidade_comercial} ${String(i.unidade_comercial ?? 'UN')} x ${brl(Number(i.valor_unitario_comercial))}`;
      p.push(row(`  ${detail}`, brl(Number(i.valor_bruto))));
    }
    p.push(line('-'), row('Qtd. total de itens', String(items.length)), row('Valor total R$', brl(bruto)));
    if (desconto > 0) p.push(row('Descontos R$', `-${brl(desconto)}`));
    if (outras > 0) p.push(row('Acrescimos R$', brl(outras)));
    p.push(CMD.BOLD_ON, row('VALOR A PAGAR R$', brl(total)), CMD.BOLD_OFF, line('-'), txt('FORMA DE PAGAMENTO\n'));
    for (const f of pagamentos) {
      p.push(row(FORMAS_PAGAMENTO_FOCUS[f.forma_pagamento] ?? `Forma ${f.forma_pagamento}`, brl(Number(f.valor_pagamento))));
    }
    p.push(line('-'), CMD.CENTER,
      txt(`NFC-e n ${doc.numero ?? '-'}  Serie ${doc.serie ?? '-'}\n`),
      txt(`Emissao: ${fmtData(emissao)}\n`),
      txt('Via consumidor\n'),
      txt('Consulte pela chave de acesso em\n'),
      txt(`${doc.urlConsultaNf ?? ''}\n`),
      CMD.BOLD_ON, txt('CHAVE DE ACESSO\n'), CMD.BOLD_OFF,
      txt(`${chaveFormatada(doc.chaveNfe as string)}\n`),
      txt('CONSUMIDOR NAO IDENTIFICADO\n'),
      CMD.LF, qrCode(doc.qrcodeUrl as string), CMD.LF);
    if (protocolo) p.push(txt(`Protocolo de autorizacao: ${protocolo}\n`));
    if (dataAut) p.push(txt(`Data de autorizacao: ${fmtData(new Date(dataAut))}\n`));
    p.push(CMD.LF, CMD.LF, CMD.CUT);
    return Buffer.concat(p);
  }
}
