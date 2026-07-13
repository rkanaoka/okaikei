import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { uuidv7 } from 'uuidv7';
import { CashMovementType } from '@prisma/client';

const METHODS = ['CASH', 'CARD', 'PIX', 'VOUCHER'] as const;

@Injectable()
export class CashService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrent() {
    const session = await this.prisma.cashSession.findFirst({
      where:   { status: 'OPEN' },
      orderBy: { openedAt: 'desc' },
    });
    if (!session) return null;
    return this.getSummary(session.id);
  }

  async open(dto: { openingAmount: number; notes?: string }) {
    const existing = await this.prisma.cashSession.findFirst({ where: { status: 'OPEN' } });
    if (existing) throw new BadRequestException('Já existe um caixa aberto');

    return this.prisma.cashSession.create({
      data: {
        id:            uuidv7(),
        openingAmount: dto.openingAmount ?? 0,
        openingNotes:  dto.notes ?? null,
      },
    });
  }

  async addMovement(sessionId: string, dto: { type: CashMovementType; amount: number; notes?: string }) {
    const session = await this.prisma.cashSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Caixa não encontrado');
    if (session.status !== 'OPEN') throw new BadRequestException('Caixa não está aberto');
    if (!dto.amount || dto.amount <= 0) throw new BadRequestException('Valor inválido');

    return this.prisma.cashMovement.create({
      data: {
        id:            uuidv7(),
        cashSessionId: sessionId,
        type:          dto.type,
        amount:        dto.amount,
        notes:         dto.notes ?? null,
      },
    });
  }

  async getSummary(sessionId: string) {
    const session = await this.prisma.cashSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Caixa não encontrado');

    const [payments, movements] = await Promise.all([
      this.prisma.payment.findMany({ where: { cashSessionId: sessionId } }),
      this.prisma.cashMovement.findMany({ where: { cashSessionId: sessionId }, orderBy: { createdAt: 'desc' } }),
    ]);

    const salesByMethod: Record<string, number> = {};
    for (const p of payments) {
      salesByMethod[p.method] = (salesByMethod[p.method] ?? 0) + Number(p.amount);
    }

    const withdrawals    = movements.filter((m) => m.type === 'WITHDRAWAL').reduce((s, m) => s + Number(m.amount), 0);
    const reinforcements = movements.filter((m) => m.type === 'REINFORCEMENT').reduce((s, m) => s + Number(m.amount), 0);

    const methods = METHODS
      .filter((m) => m === 'CASH' || (salesByMethod[m] ?? 0) > 0)
      .map((method) => {
        const sales = salesByMethod[method] ?? 0;
        if (method === 'CASH') {
          const opening  = Number(session.openingAmount);
          const esperado = opening + sales - withdrawals + reinforcements;
          return { method, sales, esperado, opening, withdrawals, reinforcements };
        }
        return { method, sales, esperado: sales, opening: 0, withdrawals: 0, reinforcements: 0 };
      });

    return {
      session,
      elapsedMinutes: Math.floor((Date.now() - session.openedAt.getTime()) / 60000),
      movements,
      methods,
      totalEsperado: methods.reduce((s, m) => s + m.esperado, 0),
    };
  }

  async close(sessionId: string, dto: { closingCounts: Record<string, number>; notes?: string }) {
    const session = await this.prisma.cashSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Caixa não encontrado');
    if (session.status !== 'OPEN') throw new BadRequestException('Caixa não está aberto');

    return this.prisma.cashSession.update({
      where: { id: sessionId },
      data: {
        status:        'CLOSED',
        closedAt:      new Date(),
        closingNotes:  dto.notes ?? null,
        closingCounts: dto.closingCounts ?? {},
      },
    });
  }
}
