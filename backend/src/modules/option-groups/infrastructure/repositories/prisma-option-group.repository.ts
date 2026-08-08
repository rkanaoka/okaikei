import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { OptionGroupRepositoryPort } from '@/modules/option-groups/domain/repositories/option-group-repository.port';
import { uuidv7 } from 'uuidv7';

const WITH_ITEMS = {
  options:   { orderBy: [{ sortOrder: 'asc' as const }, { name: 'asc' as const }] },
  menuItems: { select: { id: true, name: true } },
};

@Injectable()
export class PrismaOptionGroupRepository implements OptionGroupRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.optionGroup.findMany({
      include: WITH_ITEMS,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findById(id: string) {
    return this.prisma.optionGroup.findUnique({ where: { id }, include: WITH_ITEMS });
  }

  async create(data: { id: string; name: string; options?: Array<{ id: string; name: string; price?: number; active?: boolean; sortOrder?: number }> }) {
    const { options, ...rest } = data;
    return this.prisma.optionGroup.create({
      data: {
        ...rest,
        ...(options ? { options: { create: options } } : {}),
      },
      include: WITH_ITEMS,
    });
  }

  async updateWithOptions(id: string, data: {
    name?: string; minSelect?: number; maxSelect?: number; active?: boolean;
    options?: Array<{ id?: string; name: string; price?: number; active?: boolean; sortOrder?: number }>;
  }) {
    return this.prisma.$transaction(async (tx) => {
      if (data.options) {
        const existing = await tx.menuOption.findMany({ where: { groupId: id }, select: { id: true } });
        const keepIds  = new Set(data.options.filter((o) => o.id).map((o) => o.id));
        const toDelete = existing.filter((o) => !keepIds.has(o.id)).map((o) => o.id);
        if (toDelete.length) await tx.menuOption.deleteMany({ where: { id: { in: toDelete } } });

        for (let i = 0; i < data.options.length; i++) {
          const o = data.options[i];
          if (o.id) {
            await tx.menuOption.update({
              where: { id: o.id },
              data:  { name: o.name.trim(), price: o.price ?? 0, active: o.active ?? true, sortOrder: i },
            });
          } else {
            await tx.menuOption.create({
              data: { id: uuidv7(), groupId: id, name: o.name.trim(), price: o.price ?? 0, active: o.active ?? true, sortOrder: i },
            });
          }
        }
      }

      const { options: _opts, ...rest } = data;
      return tx.optionGroup.update({
        where:   { id },
        data:    rest,
        include: WITH_ITEMS,
      });
    });
  }

  async remove(id: string) {
    return this.prisma.optionGroup.delete({ where: { id } });
  }

  async setMenuItems(id: string, menuItemIds: string[]) {
    return this.prisma.optionGroup.update({
      where:   { id },
      data:    { menuItems: { set: menuItemIds.map((itemId) => ({ id: itemId })) } },
      include: WITH_ITEMS,
    });
  }

  async updateOption(optionId: string, data: Partial<{ name: string; price: number; active: boolean }>) {
    return this.prisma.menuOption.update({ where: { id: optionId }, data });
  }

  async findOptionById(optionId: string) {
    return this.prisma.menuOption.findUnique({ where: { id: optionId } });
  }
}
