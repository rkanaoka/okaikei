import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { VoucherRepositoryPort } from '@/modules/ponto-de-venda/domain/repositories/voucher-repository.port';

@Injectable()
export class PrismaVoucherRepository implements VoucherRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  // Stale Prisma client: voucher model not yet in generated types — resolves at docker startup (prisma generate)
  private get v() { return (this.prisma as any).voucher; }

  async findAll(filter?: { status?: string; search?: string }) {
    const where: any = {};
    if (filter?.status) where.status = filter.status;
    if (filter?.search) {
      const s = filter.search;
      where.OR = [
        { customerName: { contains: s, mode: 'insensitive' } },
        { code: { contains: s, mode: 'insensitive' } },
      ];
    }
    return this.v.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async findById(id: string) {
    return this.v.findUnique({ where: { id } });
  }

  async findByCode(code: string) {
    return this.v.findFirst({ where: { code } });
  }

  async create(data: {
    id: string; code: string; password?: string | null;
    customerName: string | null; customerCpf: string | null; customerBirthDate: Date | null;
    customerAddress: string | null; customerPhone: string | null; customerEmail: string | null;
    discountType: string; amount: number;
    menuItemIds: string[]; minOrderValue: number | null; validDaysOfWeek: number[];
    dueDate: Date | null; status: string;
  }) {
    const { password, ...rest } = data;
    return this.v.create({ data: { ...rest, confirmationPassword: password ?? null } });
  }

  async update(id: string, data: Partial<{
    customerName: string | null; customerCpf: string | null; customerBirthDate: Date | null;
    customerAddress: string | null; customerPhone: string | null; customerEmail: string | null;
    discountType: string; amount: number;
    menuItemIds: string[]; minOrderValue: number | null; validDaysOfWeek: number[];
    dueDate: Date | null; status: string;
  }>) {
    return this.v.update({ where: { id }, data });
  }

  async updateStatus(id: string, status: string) {
    return this.v.update({ where: { id }, data: { status } });
  }

  async findUsageHistory() {
    return (this.prisma as any).voucherUsage.findMany({
      include: {
        voucher: { select: { id: true, code: true, customerName: true, customerCpf: true } },
        comanda: { select: { id: true, number: true, table: { select: { label: true } } } },
      },
      orderBy: { usedAt: 'desc' },
    });
  }
}
