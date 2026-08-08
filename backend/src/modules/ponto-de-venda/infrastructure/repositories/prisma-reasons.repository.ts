import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { ReasonsRepositoryPort } from '@/modules/ponto-de-venda/domain/repositories/reasons-repository.port';

@Injectable()
export class PrismaReasonsRepository implements ReasonsRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findAllCancellationReasons() {
    return this.prisma.cancellationReason.findMany({ orderBy: { createdAt: 'asc' } });
  }

  async findCancellationUsageCounts() {
    const counts = await this.prisma.cancellation.groupBy({
      by: ['reasonId'],
      _count: { _all: true },
    });
    return counts.map((c) => ({ reasonId: c.reasonId, count: c._count._all }));
  }

  async createCancellationReason(data: { id: string; label: string }) {
    return this.prisma.cancellationReason.create({ data });
  }

  async deleteCancellationReason(id: string) {
    return this.prisma.cancellationReason.delete({ where: { id } });
  }

  async findCancellationHistory() {
    return this.prisma.cancellation.findMany({
      include: { reason: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllDiscountReasons() {
    return this.prisma.discountReason.findMany({ orderBy: { createdAt: 'asc' } });
  }

  async findDiscountUsageCounts() {
    // Cast required: complex Prisma generic causes circular type reference in older generated clients
    const counts = await (this.prisma.comanda.groupBy as any)({
      by: ['discountReasonId'],
      _count: { _all: true },
      where: { discountReasonId: { not: null } },
    });
    return (counts as any[]).map((c) => ({ reasonId: c.discountReasonId as string, count: c._count._all as number }));
  }

  async createDiscountReason(data: { id: string; label: string; type: string; value: number }) {
    return this.prisma.discountReason.create({ data });
  }

  async deleteDiscountReason(id: string) {
    return this.prisma.discountReason.delete({ where: { id } });
  }
}
