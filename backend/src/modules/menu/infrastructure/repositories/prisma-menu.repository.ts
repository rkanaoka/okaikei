import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { MenuRepositoryPort } from '@/modules/menu/domain/repositories/menu-repository.port';
import { uuidv7 } from 'uuidv7';

const OPTION_GROUPS_INCLUDE = {
  optionGroups: {
    where:   { active: true },
    include: { options: { where: { active: true }, orderBy: [{ sortOrder: 'asc' as const }, { name: 'asc' as const }] } },
  },
};

@Injectable()
export class PrismaMenuRepository implements MenuRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findAllItems(filter?: { available?: boolean }) {
    return this.prisma.menuItem.findMany({
      where:   filter?.available !== undefined ? { available: filter.available } : {},
      include: { menuCategory: true, ...OPTION_GROUPS_INCLUDE },
      orderBy: [{ menuCategory: { sortOrder: 'asc' } }, { sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findItemById(id: string) {
    return this.prisma.menuItem.findUnique({
      where:   { id },
      include: { menuCategory: true, ...OPTION_GROUPS_INCLUDE },
    });
  }

  async createItem(data: {
    id: string; name: string; description?: string; price: number;
    category: string; subcategory?: string; sortOrder?: number;
    categoryId?: string; printCategories?: string[];
    imageUrl?: string; chargeServiceFee?: boolean; availabilitySchedule?: any;
    optionGroupOrder?: string[]; optionGroupIds?: string[];
  }) {
    const { optionGroupIds, ...rest } = data;
    return this.prisma.menuItem.create({
      data: {
        ...rest,
        optionGroupOrder: optionGroupIds ?? [],
        ...(optionGroupIds ? { optionGroups: { connect: optionGroupIds.map((gid) => ({ id: gid })) } } : {}),
      } as any,
      include: { menuCategory: true },
    });
  }

  async updateItem(id: string, data: Partial<{
    name: string; description: string; price: number; category: string;
    subcategory: string; available: boolean; sortOrder: number;
    categoryId: string | null; printCategories: string[];
    imageUrl: string | null; chargeServiceFee: boolean; availabilitySchedule: any;
    optionGroupOrder: string[]; optionGroupIds: string[];
  }>) {
    const { optionGroupIds, ...rest } = data;
    return this.prisma.menuItem.update({
      where: { id },
      data: {
        ...rest,
        ...(optionGroupIds !== undefined ? {
          optionGroupOrder: optionGroupIds,
          optionGroups: { set: optionGroupIds.map((gid) => ({ id: gid })) },
        } : {}),
      },
      include: { menuCategory: true },
    });
  }

  async deactivateItem(id: string) {
    return this.prisma.menuItem.update({ where: { id }, data: { available: false } });
  }

  async findAllCategories() {
    return this.prisma.menuCategory.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async findCategoryById(id: string) {
    return this.prisma.menuCategory.findUnique({ where: { id } });
  }

  async createCategory(data: { id: string; name: string; sortOrder?: number }) {
    return this.prisma.menuCategory.create({ data });
  }

  async updateCategory(id: string, data: Partial<{ name: string; sortOrder: number }>) {
    return this.prisma.menuCategory.update({ where: { id }, data });
  }
}
