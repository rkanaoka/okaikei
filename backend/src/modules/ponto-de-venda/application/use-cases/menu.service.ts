import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { MENU_REPOSITORY_PORT, MenuRepositoryPort } from '@/modules/ponto-de-venda/domain/repositories/menu-repository.port';
import { RedisService } from '@/shared/infrastructure/cache/redis.service';
import { SyncService }  from '@/modules/sync/application/use-cases/sync.service';
import { uuidv7 }       from 'uuidv7';

// A relação M2M não preserva ordem customizada — reordena pelos ids em optionGroupOrder
function orderGroups(groups: any[], order: string[]): any[] {
  if (!order?.length) return groups;
  const byId    = new Map(groups.map((g) => [g.id, g]));
  const ordered = order.filter((id) => byId.has(id)).map((id) => byId.get(id));
  const rest    = groups.filter((g) => !order.includes(g.id));
  return [...ordered, ...rest];
}

// Verifica se o item está dentro da janela de dias/horário configurada.
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
    @Inject(MENU_REPOSITORY_PORT) private readonly repo: MenuRepositoryPort,
    private readonly redis: RedisService,
    private readonly sync:  SyncService,
  ) {}

  async findAll(includeUnavailable = false) {
    const cached = await this.redis.getMenu();
    if (cached && !includeUnavailable) return cached;

    const items = await this.repo.findAllItems(includeUnavailable ? undefined : { available: true });
    const withOrderedGroups = items.map((i) => ({ ...i, optionGroups: orderGroups(i.optionGroups, i.optionGroupOrder) }));
    const visible = includeUnavailable
      ? withOrderedGroups
      : withOrderedGroups.filter((i) => isWithinSchedule(i.availabilitySchedule));

    if (!includeUnavailable) await this.redis.cacheMenu(visible);
    return visible;
  }

  async findOne(id: string) {
    const item = await this.repo.findItemById(id);
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
    const item = await this.repo.createItem({ id: uuidv7(), ...dto });
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
    await this.findOne(id);
    const item = await this.repo.updateItem(id, dto);
    await this.redis.invalidateMenu();
    await this.sync.enqueue('menu.item_updated', 'MenuItem', id, item);
    return item;
  }

  async remove(id: string) {
    await this.findOne(id);
    const item = await this.repo.deactivateItem(id);
    await this.redis.invalidateMenu();
    await this.sync.enqueue('menu.item_deactivated', 'MenuItem', id, { id });
    return item;
  }

  async findAllCategories() {
    return this.repo.findAllCategories();
  }

  async createCategory(dto: { name: string; sortOrder?: number }) {
    if (!dto.name?.trim()) throw new BadRequestException('Nome da categoria é obrigatório');
    return this.repo.createCategory({ id: uuidv7(), name: dto.name.trim(), sortOrder: dto.sortOrder ?? 0 });
  }

  async updateCategory(id: string, dto: Partial<{ name: string; sortOrder: number }>) {
    const cat = await this.repo.findCategoryById(id);
    if (!cat) throw new NotFoundException('Categoria não encontrada');
    if (dto.name !== undefined && !dto.name.trim()) throw new BadRequestException('Nome da categoria é obrigatório');
    return this.repo.updateCategory(id, { ...dto, name: dto.name?.trim() });
  }
}
