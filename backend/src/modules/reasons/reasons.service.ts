import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { uuidv7 } from 'uuidv7';

@Injectable()
export class ReasonsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Motivos de Cancelamento ──────────────────────────────────────────────

  async listCancellationReasons() {
    const [reasons, counts] = await Promise.all([
      this.prisma.cancellationReason.findMany({ orderBy: { createdAt: 'asc' } }),
      this.prisma.cancellation.groupBy({ by: ['reasonId'], _count: { _all: true } }),
    ]);
    const countMap = new Map(counts.map((c) => [c.reasonId, c._count._all]));
    return reasons.map((r) => ({ ...r, usageCount: countMap.get(r.id) ?? 0 }));
  }

  async createCancellationReason(dto: { label: string }) {
    if (!dto.label?.trim()) throw new BadRequestException('Nome do motivo é obrigatório');
    return this.prisma.cancellationReason.create({
      data: { id: uuidv7(), label: dto.label.trim() },
    });
  }

  async listCancellationHistory() {
    return this.prisma.cancellation.findMany({
      include: { reason: true },
      orderBy:  { createdAt: 'desc' },
      take:     200,
    });
  }

  // ── Motivos de Desconto ──────────────────────────────────────────────────

  async listDiscountReasons() {
    return this.prisma.discountReason.findMany({ orderBy: { createdAt: 'asc' } });
  }

  async createDiscountReason(dto: { label: string; type: 'percent'|'fixed'; value: number }) {
    if (!dto.label?.trim()) throw new BadRequestException('Nome do motivo é obrigatório');
    if (!dto.value || dto.value <= 0) throw new BadRequestException('Valor inválido');
    if (dto.type !== 'percent' && dto.type !== 'fixed') throw new BadRequestException('Tipo inválido');
    return this.prisma.discountReason.create({
      data: { id: uuidv7(), label: dto.label.trim(), type: dto.type, value: dto.value },
    });
  }
}
