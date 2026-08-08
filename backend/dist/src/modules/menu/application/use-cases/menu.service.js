"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MenuService = void 0;
const common_1 = require("@nestjs/common");
const menu_repository_port_1 = require("../../domain/repositories/menu-repository.port");
const redis_service_1 = require("../../../../shared/infrastructure/cache/redis.service");
const sync_service_1 = require("../../../sync/application/use-cases/sync.service");
const uuidv7_1 = require("uuidv7");
function orderGroups(groups, order) {
    if (!order?.length)
        return groups;
    const byId = new Map(groups.map((g) => [g.id, g]));
    const ordered = order.filter((id) => byId.has(id)).map((id) => byId.get(id));
    const rest = groups.filter((g) => !order.includes(g.id));
    return [...ordered, ...rest];
}
function isWithinSchedule(schedule) {
    if (!schedule?.enabled)
        return true;
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const day = now.getDay();
    if (Array.isArray(schedule.days) && schedule.days.length > 0 && !schedule.days.includes(day))
        return false;
    if (schedule.startTime && schedule.endTime) {
        const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        if (hhmm < schedule.startTime || hhmm > schedule.endTime)
            return false;
    }
    return true;
}
let MenuService = class MenuService {
    constructor(repo, redis, sync) {
        this.repo = repo;
        this.redis = redis;
        this.sync = sync;
    }
    async findAll(includeUnavailable = false) {
        const cached = await this.redis.getMenu();
        if (cached && !includeUnavailable)
            return cached;
        const items = await this.repo.findAllItems(includeUnavailable ? undefined : { available: true });
        const withOrderedGroups = items.map((i) => ({ ...i, optionGroups: orderGroups(i.optionGroups, i.optionGroupOrder) }));
        const visible = includeUnavailable
            ? withOrderedGroups
            : withOrderedGroups.filter((i) => isWithinSchedule(i.availabilitySchedule));
        if (!includeUnavailable)
            await this.redis.cacheMenu(visible);
        return visible;
    }
    async findOne(id) {
        const item = await this.repo.findItemById(id);
        if (!item)
            throw new common_1.NotFoundException(`Item ${id} não encontrado`);
        return { ...item, optionGroups: orderGroups(item.optionGroups, item.optionGroupOrder) };
    }
    async create(dto) {
        const item = await this.repo.createItem({ id: (0, uuidv7_1.uuidv7)(), ...dto });
        await this.redis.invalidateMenu();
        await this.sync.enqueue('menu.item_created', 'MenuItem', item.id, item);
        return item;
    }
    async update(id, dto) {
        await this.findOne(id);
        const item = await this.repo.updateItem(id, dto);
        await this.redis.invalidateMenu();
        await this.sync.enqueue('menu.item_updated', 'MenuItem', id, item);
        return item;
    }
    async remove(id) {
        await this.findOne(id);
        const item = await this.repo.deactivateItem(id);
        await this.redis.invalidateMenu();
        await this.sync.enqueue('menu.item_deactivated', 'MenuItem', id, { id });
        return item;
    }
    async findAllCategories() {
        return this.repo.findAllCategories();
    }
    async createCategory(dto) {
        if (!dto.name?.trim())
            throw new common_1.BadRequestException('Nome da categoria é obrigatório');
        return this.repo.createCategory({ id: (0, uuidv7_1.uuidv7)(), name: dto.name.trim(), sortOrder: dto.sortOrder ?? 0 });
    }
    async updateCategory(id, dto) {
        const cat = await this.repo.findCategoryById(id);
        if (!cat)
            throw new common_1.NotFoundException('Categoria não encontrada');
        if (dto.name !== undefined && !dto.name.trim())
            throw new common_1.BadRequestException('Nome da categoria é obrigatório');
        return this.repo.updateCategory(id, { ...dto, name: dto.name?.trim() });
    }
};
exports.MenuService = MenuService;
exports.MenuService = MenuService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(menu_repository_port_1.MENU_REPOSITORY_PORT)),
    __metadata("design:paramtypes", [Object, redis_service_1.RedisService,
        sync_service_1.SyncService])
], MenuService);
//# sourceMappingURL=menu.service.js.map