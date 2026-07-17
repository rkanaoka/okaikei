import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService }  from '@/common/redis/redis.service';
import { uuidv7 } from 'uuidv7';

type OptionDto = { id?: string; name: string; price?: number; active?: boolean };

@Injectable()
export class OptionGroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis:  RedisService,
  ) {}

  async findAll() {
    return this.prisma.optionGroup.findMany({
      include: {
        options:   { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] },
        menuItems: { select: { id: true, name: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findOne(id: string) {
    const group = await this.prisma.optionGroup.findUnique({
      where:   { id },
      include: { options: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }, menuItems: { select: { id: true, name: true } } },
    });
    if (!group) throw new NotFoundException(`Grupo de opções ${id} não encontrado`);
    return group;
  }

  async create(dto: { name: string; minSelect?: number; maxSelect?: number; options?: OptionDto[] }) {
    if (!dto.name?.trim()) throw new BadRequestException('Nome do grupo é obrigatório');
    const options = dto.options ?? [];
    const group = await this.prisma.optionGroup.create({
      data: {
        id: uuidv7(),
        name: dto.name.trim(),
        minSelect: dto.minSelect ?? 0,
        maxSelect: dto.maxSelect ?? 1,
        options: {
          create: options.map((o, i) => ({
            id: uuidv7(), name: o.name.trim(), price: o.price ?? 0, active: o.active ?? true, sortOrder: i,
          })),
        },
      },
      include: { options: true, menuItems: { select: { id: true, name: true } } },
    });
    await this.redis.invalidateMenu();
    return group;
  }

  async update(id: string, dto: Partial<{
    name: string; minSelect: number; maxSelect: number; active: boolean; options: OptionDto[];
  }>) {
    await this.findOne(id); // throws if not found
    if (dto.name !== undefined && !dto.name.trim()) throw new BadRequestException('Nome do grupo é obrigatório');

    const group = await this.prisma.$transaction(async (tx) => {
      if (dto.options) {
        const existing = await tx.menuOption.findMany({ where: { groupId: id }, select: { id: true } });
        const keepIds = new Set(dto.options.filter((o) => o.id).map((o) => o.id));
        const toDelete = existing.filter((o) => !keepIds.has(o.id)).map((o) => o.id);
        if (toDelete.length) await tx.menuOption.deleteMany({ where: { id: { in: toDelete } } });

        for (let i = 0; i < dto.options.length; i++) {
          const o = dto.options[i];
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

      return tx.optionGroup.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.minSelect !== undefined ? { minSelect: dto.minSelect } : {}),
          ...(dto.maxSelect !== undefined ? { maxSelect: dto.maxSelect } : {}),
          ...(dto.active !== undefined ? { active: dto.active } : {}),
        },
        include: { options: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }, menuItems: { select: { id: true, name: true } } },
      });
    });
    await this.redis.invalidateMenu();
    return group;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.optionGroup.delete({ where: { id } });
    await this.redis.invalidateMenu();
    return { id };
  }

  async setItems(id: string, menuItemIds: string[]) {
    await this.findOne(id);
    const group = await this.prisma.optionGroup.update({
      where: { id },
      data:  { menuItems: { set: menuItemIds.map((itemId) => ({ id: itemId })) } },
      include: { options: true, menuItems: { select: { id: true, name: true } } },
    });
    await this.redis.invalidateMenu();
    return group;
  }

  async updateOption(optionId: string, dto: Partial<{ name: string; price: number; active: boolean }>) {
    const option = await this.prisma.menuOption.findUnique({ where: { id: optionId } });
    if (!option) throw new NotFoundException(`Opção ${optionId} não encontrada`);
    const updated = await this.prisma.menuOption.update({
      where: { id: optionId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.price !== undefined ? { price: dto.price } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
    await this.redis.invalidateMenu();
    return updated;
  }
}
