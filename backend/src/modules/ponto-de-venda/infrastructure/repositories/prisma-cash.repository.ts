import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CashRepositoryPort } from '@/modules/ponto-de-venda/domain/repositories/cash-repository.port';
import { CashMovementType } from '@prisma/client';

@Injectable()
export class PrismaCashRepository implements CashRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async listSessions(filter?: { from?: Date; to?: Date }) {
    const where: any = {};
    if (filter?.from || filter?.to) {
      where.openedAt = {};
      if (filter.from) where.openedAt.gte = filter.from;
      if (filter.to)   where.openedAt.lte = filter.to;
    }
    return this.prisma.cashSession.findMany({ where, orderBy: { openedAt: 'desc' } });
  }

  async findSessionById(id: string) {
    return this.prisma.cashSession.findUnique({ where: { id } });
  }

  async findOpenSession() {
    return this.prisma.cashSession.findFirst({
      where:   { status: 'OPEN' },
      orderBy: { openedAt: 'desc' },
    });
  }

  async createSession(data: { id: string; openingAmount: number; openingNotes?: string }) {
    return this.prisma.cashSession.create({ data });
  }

  async closeSession(id: string, data: { closingCounts: Record<string, number>; notes?: string }) {
    return this.prisma.cashSession.update({
      where: { id },
      data: {
        status:        'CLOSED',
        closedAt:      new Date(),
        closingNotes:  data.notes ?? null,
        closingCounts: data.closingCounts ?? {},
      },
    });
  }

  async getSessionPayments(sessionId: string) {
    return this.prisma.payment.findMany({ where: { cashSessionId: sessionId } });
  }

  async getSessionMovements(sessionId: string) {
    return this.prisma.cashMovement.findMany({
      where:   { cashSessionId: sessionId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addMovement(data: {
    id: string; cashSessionId: string; type: CashMovementType; amount: number; notes?: string;
  }) {
    return this.prisma.cashMovement.create({ data });
  }
}
