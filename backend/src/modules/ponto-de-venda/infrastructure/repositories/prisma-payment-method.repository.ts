import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import {
  PaymentMethodData,
  PaymentMethodRepositoryPort,
} from '@/modules/ponto-de-venda/domain/repositories/payment-method-repository.port';

@Injectable()
export class PrismaPaymentMethodRepository implements PaymentMethodRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filter?: { active?: boolean }) {
    return this.prisma.paymentMethodConfig.findMany({
      where:   filter?.active !== undefined ? { active: filter.active } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findById(id: string) {
    return this.prisma.paymentMethodConfig.findUnique({ where: { id } });
  }

  async findByCode(code: string) {
    return this.prisma.paymentMethodConfig.findUnique({ where: { code } });
  }

  async findByCodes(codes: string[]) {
    return this.prisma.paymentMethodConfig.findMany({ where: { code: { in: codes } } });
  }

  async findUsageCounts() {
    const counts = await this.prisma.payment.groupBy({ by: ['method'], _count: { _all: true } });
    return counts.map((c) => ({ method: c.method, count: c._count._all }));
  }

  async create(data: PaymentMethodData & { id: string; code: string }) {
    return this.prisma.paymentMethodConfig.create({ data });
  }

  async update(id: string, data: Partial<PaymentMethodData>) {
    return this.prisma.paymentMethodConfig.update({ where: { id }, data });
  }
}
