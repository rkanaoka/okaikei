import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService }  from '@/common/redis/redis.service';
import { SyncService }   from '@/modules/sync/sync.service';
import { uuidv7 }        from 'uuidv7';

// Grupos de opções vinculados ao item — só ativos, opções ordenadas por sortOrder.
const OPTION_GROUPS_INCLUDE = {
  optionGroups: {
    where:   { active: true },
    include: { options: { where: { active: true }, orderBy: [{ sortOrder: 'asc' as const }, { name: 'asc' as const }] } },
  },
};

// A relação M2M não preserva ordem customizada — reordena pelos ids em optionGroupOrder
// (grupos vinculados depois, fora dessa lista, vão ao final).
function orderGroups(groups: any[], order: string[]): any[] {
  if (!order?.length) return groups;
  const byId = new Map(groups.map((g) => [g.id, g]));
  const ordered = order.filter((id) => byId.has(id)).map((id) => byId.get(id));
  const rest = groups.filter((g) => !order.includes(g.id));
  return [...ordered, ...rest];
}

// Verifica se o item está dentro da janela de dias/horário configurada.
// Sem schedule (ou desabilitado) = sempre disponível.
function isWithinSchedule(schedule: any): boolean {
  if (!schedule?.enabled) return true;
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const day = now.getDay();
  if (Array.isArray(schedule.days) && schedule.days.length > 0 && !schedule.days.includes(day)) return false;
  if (schedule.startTime && schedule.endTime) {
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    if (hhmm < schedule.startTime || hhmm > schedule.endTime) return false;
  }
  return true;
}

@Injectable()
export class MenuService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis:  RedisService,
    private readonly sync:   SyncService,
  ) {}

  // ── Itens ─────────────────────────────────────────────────────────────────

  async findAll(includeUnavailable = false) {
    const cached = await this.redis.getMenu();
    if (cached && !includeUnavailable) return cached;

    const items = await this.prisma.menuItem.findMany({
      where:   includeUnavailable ? {} : { available: true },
      include: { menuCategory: true, ...OPTION_GROUPS_INCLUDE },
      orderBy: [{ menuCategory: { sortOrder: 'asc' } }, { sortOrder: 'asc' }, { name: 'asc' }],
    });
    const withOrderedGroups = items.map((i) => ({ ...i, optionGroups: orderGroups(i.optionGroups, i.optionGroupOrder) }));

    // No cardápio público (garçom), esconde itens fora da janela de disponibilidade configurada
    const visible = includeUnavailable ? withOrderedGroups : withOrderedGroups.filter((i) => isWithinSchedule(i.availabilitySchedule));

    if (!includeUnavailable) await this.redis.cacheMenu(visible);
    return visible;
  }

  async findOne(id: string) {
    const item = await this.prisma.menuItem.findUnique({
      where: { id },
      include: { menuCategory: true, ...OPTION_GROUPS_INCLUDE },
    });
    if (!item) throw new NotFoundException(`Item ${id} não encontrado`);
    return { ...item, optionGroups: orderGroups(item.optionGroups, item.optionGroupOrder) };
  }

  async create(dto: {
    name: string; description?: string; price: number;
    category: string; subcategory?: string; sortOrder?: number;
    categoryId?: string; printCategories?: string[];
    imageUrl?: string; chargeServiceFee?: boolean; availabilitySchedule?: any;
    optionGroupIds?: string[];
  }) {
    const { optionGroupIds, ...rest } = dto;
    const item = await this.prisma.menuItem.create({
      data: {
        id: uuidv7(), ...rest,
        optionGroupOrder: optionGroupIds ?? [],
        ...(optionGroupIds ? { optionGroups: { connect: optionGroupIds.map((gid) => ({ id: gid })) } } : {}),
      },
      include: { menuCategory: true },
    });
    await this.redis.invalidateMenu();
    await this.sync.enqueue('menu.item_created', 'MenuItem', item.id, item);
    return item;
  }

  async update(id: string, dto: Partial<{
    name: string; description: string; price: number; category: string;
    subcategory: string; available: boolean; sortOrder: number;
    categoryId: string | null; printCategories: string[];
    imageUrl: string | null; chargeServiceFee: boolean; availabilitySchedule: any;
    optionGroupIds: string[];
  }>) {
    await this.findOne(id); // throws if not found
    const { optionGroupIds, ...rest } = dto;
    const item = await this.prisma.menuItem.update({
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

  // ── Categorias ────────────────────────────────────────────────────────────

  async findAllCategories() {
    return this.prisma.menuCategory.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async createCategory(dto: { name: string; sortOrder?: number }) {
    if (!dto.name?.trim()) throw new BadRequestException('Nome da categoria é obrigatório');
    return this.prisma.menuCategory.create({
      data: { id: uuidv7(), name: dto.name.trim(), sortOrder: dto.sortOrder ?? 0 },
    });
  }

  async updateCategory(id: string, dto: Partial<{ name: string; sortOrder: number }>) {
    const cat = await this.prisma.menuCategory.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Categoria não encontrada');
    if (dto.name !== undefined && !dto.name.trim()) throw new BadRequestException('Nome da categoria é obrigatório');
    return this.prisma.menuCategory.update({
      where: { id },
      data:  { ...dto, name: dto.name?.trim() },
    });
  }
}
