import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { VoucherRepositoryPort } from '@/modules/vouchers/domain/repositories/voucher-repository.port';

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
    id: string; code: string; password: string;
    customerName: string; customerCpf: string; customerBirthDate: Date;
    customerAddress: string; customerPhone: string; customerEmail: string;
    amount: number; dueDate: Date; status: string;
  }) {
    const { password, ...rest } = data;
    return this.v.create({ data: { ...rest, confirmationPassword: password } });
  }

  async update(id: string, data: Partial<{
    customerName: string; customerCpf: string; customerBirthDate: Date;
    customerAddress: string; customerPhone: string; customerEmail: string;
    amount: number; dueDate: Date; status: string;
  }>) {
    return this.v.update({ where: { id }, data });
  }

  async updateStatus(id: string, status: string) {
    return this.v.update({ where: { id }, data: { status } });
  }
}
