import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService }  from '@/common/redis/redis.service';
import { SyncService }   from '@/modules/sync/sync.service';
import { uuidv7 }        from 'uuidv7';

@Injectable()
export class MenuService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis:  RedisService,
    private readonly sync:   SyncService,
  ) {}

  async findAll(includeUnavailable = false) {
    const cached = await this.redis.getMenu();
    if (cached && !includeUnavailable) return cached;

    const items = await this.prisma.menuItem.findMany({
      where:   includeUnavailable ? {} : { available: true },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });

    if (!includeUnavailable) await this.redis.cacheMenu(items);
    return items;
  }

  async findOne(id: string) {
    const item = await this.prisma.menuItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Item ${id} não encontrado`);
    return item;
  }

  async create(dto: {
    name: string; description?: string; price: number;
    category: string; subcategory?: string; sortOrder?: number;
  }) {
    const item = await this.prisma.menuItem.create({
      data: { id: uuidv7(), ...dto },
    });
    await this.redis.invalidateMenu();
    await this.sync.enqueue('menu.item_created', 'MenuItem', item.id, item);
    return item;
  }

  async update(id: string, dto: Partial<{
    name: string; description: string; price: number; category: string;
    subcategory: string; available: boolean; sortOrder: number;
  }>) {
    await this.findOne(id); // throws if not found
    const item = await this.prisma.menuItem.update({ where: { id }, data: dto });
    await this.redis.invalidateMenu();
    await this.sync.enqueue('menu.item_updated', 'MenuItem', id, item);
    return item;
  }

  async remove(id: string) {
    await this.findOne(id);
    const item = await this.prisma.menuItem.update({
      where: { id },
      data:  { available: false },
    });
    await this.redis.invalidateMenu();
    await this.sync.enqueue('menu.item_deactivated', 'MenuItem', id, { id });
    return item;
  }
}
