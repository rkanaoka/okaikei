import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import * as net from 'net';
import {
  TemplateType, DEFAULT_CONFIGS, DEFAULT_ENABLED, isTemplateType,
} from '@/modules/print-templates/print-template-defaults';

const ESC = 0x1b;
const GS  = 0x1d;

const CMD = {
  INIT:          Buffer.from([ESC, 0x40]),
  ALIGN_CENTER:  Buffer.from([ESC, 0x61, 0x01]),
  ALIGN_LEFT:    Buffer.from([ESC, 0x61, 0x00]),
  BOLD_ON:       Buffer.from([ESC, 0x45, 0x01]),
  BOLD_OFF:      Buffer.from([ESC, 0x45, 0x00]),
  DOUBLE_HEIGHT: Buffer.from([ESC, 0x21, 0x10]),
  NORMAL_SIZE:   Buffer.from([ESC, 0x21, 0x00]),
  LF:            Buffer.from([0x0a]),
  CUT_PARTIAL:   Buffer.from([GS,  0x56, 0x01]),
  CUT_FULL:      Buffer.from([GS,  0x56, 0x00]),
};

function txt(s: string) { return Buffer.from(s, 'latin1'); }
function line(c = '-',  n = 32) { return txt(c.repeat(n) + '\n'); }
function fmtBRL(v: number) { return `R$ ${v.toFixed(2).replace('.', ',')}`.padStart(9); }

@Injectable()
export class PrintingService {
  private readonly logger = new Logger(PrintingService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── TCP Socket ─────────────────────────────────────────────────────────────

  private send(ip: string, port: number, data: Buffer, timeout = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      socket.setTimeout(timeout);
      socket.connect(port, ip, () => {
        socket.write(data, (err) => {
          socket.end();
          err ? reject(err) : resolve();
        });
      });
      socket.on('timeout', () => { socket.destroy(); reject(new Error(`Timeout ${ip}:${port}`)); });
      socket.on('error',   (err) => { socket.destroy(); reject(err); });
    });
  }

  private async getPrinter(category: string) {
    return this.prisma.printer.findUnique({ where: { category } });
  }

  private async getTemplate(type: TemplateType) {
    const row = await this.prisma.printTemplate.findUnique({ where: { type } });
    return {
      enabled: row?.enabled ?? DEFAULT_ENABLED[type],
      config:  { ...DEFAULT_CONFIGS[type], ...(row?.config as object ?? {}) },
    };
  }

  // ── Ticket de pedido (cozinha / bar) ──────────────────────────────────────

  async printOrderItems(comanda: any, items: any[]) {
    const byCategory: Record<string, any[]> = {};
    for (const item of items) {
      const cat = item.menuItem?.category ?? item.category;
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(item);
    }

    await Promise.allSettled(
      Object.entries(byCategory).map(async ([cat, catItems]) => {
        const isTemplated = cat === 'kitchen' || cat === 'bar';
        const template = isTemplated
          ? await this.getTemplate(cat as TemplateType)
          : { enabled: true, config: DEFAULT_CONFIGS.kitchen };
        if (!template.enabled) return;

        const printer = await this.getPrinter(cat);
        if (!printer || !printer.enabled) {
          this.logger.warn(`Impressora ${cat} não configurada ou desativada`);
          return;
        }
        const ticket = this.buildOrderTicket(comanda, catItems, cat, template.config);
        await this.send(printer.ip, printer.port, ticket);
        this.logger.log(`Pedido impresso em ${cat} (${printer.ip})`);
      }),
    );
  }

  // ── Recibo (caixa) + cupom fiscal ─────────────────────────────────────────

  async printReceipt(comanda: any, payments: any[], total: number) {
    const printer = await this.getPrinter('cashier');
    if (!printer || !printer.enabled) {
      this.logger.warn('Impressora caixa não configurada');
      return;
    }

    const receiptTemplate = await this.getTemplate('receipt');
    if (receiptTemplate.enabled) {
      const ticket = this.buildReceiptTicket(comanda, payments, total, receiptTemplate.config);
      await this.send(printer.ip, printer.port, ticket);
      this.logger.log(`Recibo impresso (${printer.ip})`);
    }

    const fiscalTemplate = await this.getTemplate('fiscal');
    if (fiscalTemplate.enabled) {
      const fiscalTicket = this.buildFiscalTicket(comanda, payments, total, fiscalTemplate.config);
      await this.send(printer.ip, printer.port, fiscalTicket);
      this.logger.log(`Cupom fiscal impresso (${printer.ip})`);
    }
  }

  // ── Teste de conexão ──────────────────────────────────────────────────────

  async printTest(category: string, printer: { ip: string; port: number; label?: string | null }) {
    const label  = printer.label ?? category.toUpperCase();
    const now    = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const ticket = Buffer.concat([
      CMD.INIT, CMD.ALIGN_CENTER, CMD.BOLD_ON, CMD.DOUBLE_HEIGHT,
      txt(`BODOGAMI\n`), CMD.NORMAL_SIZE, CMD.BOLD_OFF,
      txt(`TESTE DE IMPRESSORA\n`), line('='),
      CMD.ALIGN_LEFT,
      txt(`Local : ${label}\n`),
      txt(`IP    : ${printer.ip}:${printer.port}\n`),
      txt(`Hora  : ${now}\n`),
      line('='),
      CMD.ALIGN_CENTER, txt(`Impressora OK!\n`),
      CMD.LF, CMD.LF, CMD.CUT_PARTIAL,
    ]);
    await this.send(printer.ip, printer.port, ticket);
    this.logger.log(`Teste impresso em ${label} (${printer.ip})`);
  }

  // Imprime uma amostra de um modelo (config ainda não salva) — usado pelo botão "Imprimir Teste"
  async printTemplateSample(type: string, override: { enabled?: boolean; config?: Record<string, any> }) {
    if (!isTemplateType(type)) throw new BadRequestException(`Tipo de modelo inválido: ${type}`);
    const cfg = { ...DEFAULT_CONFIGS[type], ...(override.config ?? {}) };

    const sampleComanda: any = {
      number: 42,
      table: { label: 'Mesa 5' },
      customerName: 'Cliente Teste',
      user: { name: 'Garçom Teste' },
      surchargeType: 'percent', surchargeValue: 10,
      discountType: 'fixed', discountValue: 2,
    };
    const sampleItems = [
      { quantity: 2, notes: 'sem cebola', unitPrice: 20, menuItem: { name: 'Ramen Shoyu' } },
      { quantity: 1, notes: '',           unitPrice: 16, menuItem: { name: 'Cerveja Asahi' } },
    ];
    const samplePayments = [{ method: 'CASH', amount: 56 }];
    const sampleTotal = sampleItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

    const printerCategory = (type === 'receipt' || type === 'fiscal') ? 'cashier' : type;
    const printer = await this.getPrinter(printerCategory);
    if (!printer || !printer.enabled) {
      throw new Error(`Impressora '${printerCategory}' não configurada ou desativada`);
    }

    let ticket: Buffer;
    if (type === 'kitchen' || type === 'bar') {
      ticket = this.buildOrderTicket(sampleComanda, sampleItems, type, cfg);
    } else if (type === 'receipt') {
      ticket = this.buildReceiptTicket({ ...sampleComanda, items: sampleItems }, samplePayments, sampleTotal, cfg);
    } else {
      ticket = this.buildFiscalTicket(sampleComanda, samplePayments, sampleTotal, cfg);
    }
    await this.send(printer.ip, printer.port, ticket);
  }

  // ── Builders ──────────────────────────────────────────────────────────────

  private buildOrderTicket(comanda: any, items: any[], category: string, cfg: Record<string, any>): Buffer {
    const area = category.toUpperCase();
    const now  = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const parts: Buffer[] = [
      CMD.INIT, CMD.ALIGN_CENTER, CMD.BOLD_ON, CMD.DOUBLE_HEIGHT,
      txt(`BODOGAMI\n`), CMD.NORMAL_SIZE, CMD.BOLD_OFF,
      txt(`${area}\n`), line('='),
      CMD.ALIGN_LEFT,
      CMD.BOLD_ON, txt(`Mesa: ${comanda.table?.label ?? '-'}\n`), CMD.BOLD_OFF,
    ];
    if (cfg.showCliente && comanda.customerName) parts.push(txt(`Cliente: ${comanda.customerName}\n`));
    if (cfg.showComanda) parts.push(txt(`Comanda: #${comanda.number}\n`));
    if (cfg.showGarcom && comanda.user?.name) parts.push(txt(`Garçom: ${comanda.user.name}\n`));
    parts.push(txt(`${now}\n`), line('-'));

    for (const item of items) {
      const name = item.menuItem?.name ?? item.name;
      parts.push(CMD.BOLD_ON, txt(`${item.quantity}x  ${name}\n`), CMD.BOLD_OFF);
      if (cfg.showObservacoes && item.notes) parts.push(txt(`    >> ${item.notes}\n`));
    }
    parts.push(line('='));
    if (cfg.footerText) parts.push(CMD.ALIGN_CENTER, txt(`${cfg.footerText}\n`), CMD.ALIGN_LEFT);
    parts.push(CMD.LF, CMD.LF, cfg.cutMode === 'full' ? CMD.CUT_FULL : CMD.CUT_PARTIAL);
    return Buffer.concat(parts);
  }

  private buildReceiptTicket(comanda: any, payments: any[], total: number, cfg: Record<string, any>): Buffer {
    const now      = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const items    = comanda.items ?? [];
    const subtotal = items.reduce((s: number, i: any) => s + Number(i.unitPrice) * i.quantity, 0);
    const parts: Buffer[] = [
      CMD.INIT, CMD.ALIGN_CENTER, CMD.BOLD_ON, CMD.DOUBLE_HEIGHT,
      txt(`${cfg.storeName || 'BODOGAMI'}\n`), CMD.NORMAL_SIZE, CMD.BOLD_OFF,
    ];
    if (cfg.headerText) parts.push(txt(`${cfg.headerText}\n`));
    if (cfg.showEndereco && cfg.endereco) parts.push(txt(`${cfg.endereco}\n`));
    parts.push(
      txt(`RECIBO\n`), line('='),
      CMD.ALIGN_LEFT,
      txt(`Mesa: ${comanda.table?.label ?? '-'}\n`),
    );
    if (comanda.customerName) parts.push(txt(`Cliente: ${comanda.customerName}\n`));
    parts.push(txt(`Comanda: #${comanda.number}   ${now}\n`), line('-'));

    for (const item of items) {
      const name  = (item.menuItem?.name ?? item.name ?? '').slice(0, 20).padEnd(20);
      const qty   = `${item.quantity}x`.padStart(3);
      const price = fmtBRL(Number(item.unitPrice) * item.quantity);
      parts.push(txt(`${qty} ${name} ${price}\n`));
    }
    parts.push(line('-'), txt(`${'Subtotal'.padEnd(23)}${fmtBRL(subtotal)}\n`));

    if (cfg.showTaxaServico && parseFloat(comanda.surchargeValue) > 0 && comanda.surchargeType) {
      const v = comanda.surchargeType === 'percent'
        ? subtotal * parseFloat(comanda.surchargeValue) / 100
        : parseFloat(comanda.surchargeValue);
      parts.push(txt(`${'Taxa de servico'.padEnd(23)}${fmtBRL(v)}\n`));
    }
    if (cfg.showDesconto && parseFloat(comanda.discountValue) > 0 && comanda.discountType) {
      const v = comanda.discountType === 'percent'
        ? subtotal * parseFloat(comanda.discountValue) / 100
        : parseFloat(comanda.discountValue);
      parts.push(txt(`${'Desconto'.padEnd(23)}-${fmtBRL(v).trim()}\n`));
    }

    parts.push(line('='), CMD.BOLD_ON, txt(`${'TOTAL'.padEnd(23)}${fmtBRL(total)}\n`), CMD.BOLD_OFF, line('-'));

    const methodLabel: Record<string, string> = { CASH: 'DINHEIRO', CARD: 'CARTAO', PIX: 'PIX', VOUCHER: 'VOUCHER' };
    for (const p of payments) {
      parts.push(txt(`${(methodLabel[p.method] ?? p.method).padEnd(23)}${fmtBRL(Number(p.amount))}\n`));
    }

    if (cfg.showAssinatura) {
      parts.push(line('-'), CMD.LF, txt('_'.repeat(28) + '\n'), CMD.ALIGN_CENTER, txt('Assinatura cliente\n'), CMD.ALIGN_LEFT);
    }

    parts.push(line('='), CMD.ALIGN_CENTER);
    if (cfg.footerText) parts.push(txt(`${cfg.footerText}\n`));
    parts.push(CMD.LF, CMD.LF, cfg.cutMode === 'full' ? CMD.CUT_FULL : CMD.CUT_PARTIAL);
    return Buffer.concat(parts);
  }

  private buildFiscalTicket(comanda: any, payments: any[], total: number, cfg: Record<string, any>): Buffer {
    const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const parts: Buffer[] = [
      CMD.INIT, CMD.ALIGN_CENTER, CMD.BOLD_ON,
      txt(`${cfg.razaoSocial || 'Bodogami Ltda'}\n`), CMD.BOLD_OFF,
      txt(`CNPJ: ${cfg.cnpj || ''}\n`),
    ];
    if (cfg.endereco) parts.push(txt(`${cfg.endereco}\n`));
    parts.push(
      line('='), CMD.BOLD_ON, txt(`CUPOM FISCAL\n`), CMD.BOLD_OFF, line('='),
      CMD.ALIGN_LEFT,
      txt(`Comanda: #${comanda.number}   ${now}\n`), line('-'),
      CMD.ALIGN_CENTER, CMD.BOLD_ON, txt(`${'TOTAL'.padEnd(10)}${fmtBRL(total)}\n`), CMD.BOLD_OFF,
      line('-'),
    );
    if (cfg.footerText) parts.push(txt(`${cfg.footerText}\n`));
    parts.push(CMD.LF, CMD.LF, cfg.cutMode === 'full' ? CMD.CUT_FULL : CMD.CUT_PARTIAL);
    return Buffer.concat(parts);
  }
}
