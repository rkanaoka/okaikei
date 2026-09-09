import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { PartnershipRepositoryPort, PartnershipCouponInput } from '@/modules/ponto-de-venda/domain/repositories/partnership-repository.port';
import { uuidv7 } from 'uuidv7';

const WITH_COUPONS = {
  coupons: {
    include: {
      menuItem: { select: { id: true, name: true, price: true } },
      category: { select: { id: true, name: true } },
    },
  },
};

@Injectable()
export class PrismaPartnershipRepository implements PartnershipRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.partnership.findMany({ include: WITH_COUPONS, orderBy: { createdAt: 'desc' } });
  }

  async findById(id: string) {
    return this.prisma.partnership.findUnique({ where: { id }, include: WITH_COUPONS });
  }

  async findByCode(code: string) {
    return this.prisma.partnership.findFirst({ where: { code }, include: WITH_COUPONS });
  }

  async create(data: {
    id: string; name: string; description: string | null; responsible: string | null;
    contact: string | null; cnpj: string | null; code: string;
    startDate: Date | null; endDate: Date | null;
    validDaysOfWeek: number[]; startTime: string | null; endTime: string | null;
    coupons: PartnershipCouponInput[];
  }) {
    const { coupons, ...rest } = data;
    return this.prisma.partnership.create({
      data: {
        ...rest,
        coupons: {
          create: coupons.map((c) => ({
            id: uuidv7(),
            type: c.type as any,
            menuItemId: c.menuItemId ?? null,
            categoryId: c.categoryId ?? null,
            discountType: c.discountType ?? null,
            amount: c.amount ?? null,
            minOrderValue: c.minOrderValue ?? null,
            active: c.active ?? true,
          })),
        },
      },
      include: WITH_COUPONS,
    });
  }

  async updateWithCoupons(id: string, data: Partial<{
    name: string; description: string | null; responsible: string | null;
    contact: string | null; cnpj: string | null;
    startDate: Date | null; endDate: Date | null;
    validDaysOfWeek: number[]; startTime: string | null; endTime: string | null;
    active: boolean;
    coupons: PartnershipCouponInput[];
  }>) {
    return this.prisma.$transaction(async (tx) => {
      if (data.coupons) {
        const existing = await tx.partnershipCoupon.findMany({ where: { partnershipId: id }, select: { id: true } });
        const keepIds  = new Set(data.coupons.filter((c) => c.id).map((c) => c.id));
        const toDelete = existing.filter((c) => !keepIds.has(c.id)).map((c) => c.id);
        if (toDelete.length) await tx.partnershipCoupon.deleteMany({ where: { id: { in: toDelete } } });

        for (const c of data.coupons) {
          const fields = {
            type: c.type as any,
            menuItemId: c.menuItemId ?? null,
            categoryId: c.categoryId ?? null,
            discountType: c.discountType ?? null,
            amount: c.amount ?? null,
            minOrderValue: c.minOrderValue ?? null,
            active: c.active ?? true,
          };
          if (c.id) {
            await tx.partnershipCoupon.update({ where: { id: c.id }, data: fields });
          } else {
            await tx.partnershipCoupon.create({ data: { id: uuidv7(), partnershipId: id, ...fields } });
          }
        }
      }

      const { coupons: _coupons, ...rest } = data;
      return tx.partnership.update({ where: { id }, data: rest, include: WITH_COUPONS });
    });
  }

  async remove(id: string) {
    return this.prisma.partnership.delete({ where: { id } });
  }
}
