import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { PrintingService } from './printing.service';
import { PrismaService } from '@/common/prisma/prisma.service';

@Controller('print')
export class PrintingController {
  constructor(
    private readonly printing: PrintingService,
    private readonly prisma: PrismaService,
  ) {}

  // ── Teste de impressora ────────────────────────────────────────────────────
  // POST /api/print/test/:category   (category: kitchen | bar | cashier)
  @Post('test/:category')
  async test(@Param('category') category: string) {
    const printer = await this.prisma.printer.findUnique({ where: { category } });
    if (!printer) return { ok: false, error: `Impressora '${category}' não encontrada no banco.` };
    if (!printer.enabled) return { ok: false, error: `Impressora '${category}' está desativada.` };

    try {
      await this.printing.printTest(category, printer);
      return { ok: true, message: `Teste enviado para ${printer.label} (${printer.ip}:${printer.port})` };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  // ── Status das impressoras ─────────────────────────────────────────────────
  // GET /api/print/status
  @Get('status')
  async status() {
    const printers = await this.prisma.printer.findMany({ orderBy: { category: 'asc' } });
    return printers.map(p => ({
      category: p.category,
      label:    p.label,
      ip:       p.ip,
      port:     p.port,
      enabled:  p.enabled,
    }));
  }

  // ── Re-impressão manual ───────────────────────────────────────────────────
  // POST /api/print/reprint
  @Post('reprint')
  async reprint(@Body() body: { type: 'order' | 'receipt'; comandaId: string }) {
    const comanda = await this.prisma.comanda.findUnique({
      where:   { id: body.comandaId },
      include: { table: true, items: { include: { menuItem: true } }, payments: true },
    });
    if (!comanda) return { ok: false, error: 'Comanda não encontrada' };

    if (body.type === 'receipt') {
      const total = comanda.payments.reduce((s: number, p: any) => s + Number(p.amount), 0);
      await this.printing.printReceipt(comanda, comanda.payments, total);
    } else {
      await this.printing.printOrderItems(comanda, comanda.items);
    }

    return { ok: true };
  }
}
