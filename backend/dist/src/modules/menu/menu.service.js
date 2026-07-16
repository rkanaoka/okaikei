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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MenuService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const redis_service_1 = require("../../common/redis/redis.service");
const sync_service_1 = require("../sync/sync.service");
const uuidv7_1 = require("uuidv7");
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
    constructor(prisma, redis, sync) {
        this.prisma = prisma;
        this.redis = redis;
        this.sync = sync;
    }
    async findAll(includeUnavailable = false) {
        const cached = await this.redis.getMenu();
        if (cached && !includeUnavailable)
            return cached;
        const items = await this.prisma.menuItem.findMany({
            where: includeUnavailable ? {} : { available: true },
            include: { menuCategory: true },
            orderBy: [{ menuCategory: { sortOrder: 'asc' } }, { sortOrder: 'asc' }, { name: 'asc' }],
        });
        const visible = includeUnavailable ? items : items.filter((i) => isWithinSchedule(i.availabilitySchedule));
        if (!includeUnavailable)
            await this.redis.cacheMenu(visible);
        return visible;
    }
    async findOne(id) {
        const item = await this.prisma.menuItem.findUnique({ where: { id }, include: { menuCategory: true } });
        if (!item)
            throw new common_1.NotFoundException(`Item ${id} não encontrado`);
        return item;
    }
    async create(dto) {
        const { optionGroupIds, ...rest } = dto;
        const item = await this.prisma.menuItem.create({
            data: {
                id: (0, uuidv7_1.uuidv7)(), ...rest,
                optionGroupOrder: optionGroupIds ?? [],
                ...(optionGroupIds ? { optionGroups: { connect: optionGroupIds.map((gid) => ({ id: gid })) } } : {}),
            },
            include: { menuCategory: true },
        });
        await this.redis.invalidateMenu();
        await this.sync.enqueue('menu.item_created', 'MenuItem', item.id, item);
        return item;
    }
    async update(id, dto) {
        await this.findOne(id);
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
    async remove(id) {
        await this.findOne(id);
        const item = await this.prisma.menuItem.update({
            where: { id },
            data: { available: false },
        });
        await this.redis.invalidateMenu();
        await this.sync.enqueue('menu.item_deactivated', 'MenuItem', id, { id });
        return item;
    }
    async findAllCategories() {
        return this.prisma.menuCategory.findMany({ orderBy: { sortOrder: 'asc' } });
    }
    async createCategory(dto) {
        if (!dto.name?.trim())
            throw new common_1.BadRequestException('Nome da categoria é obrigatório');
        return this.prisma.menuCategory.create({
            data: { id: (0, uuidv7_1.uuidv7)(), name: dto.name.trim(), sortOrder: dto.sortOrder ?? 0 },
        });
    }
    async updateCategory(id, dto) {
        const cat = await this.prisma.menuCategory.findUnique({ where: { id } });
        if (!cat)
            throw new common_1.NotFoundException('Categoria não encontrada');
        if (dto.name !== undefined && !dto.name.trim())
            throw new common_1.BadRequestException('Nome da categoria é obrigatório');
        return this.prisma.menuCategory.update({
            where: { id },
            data: { ...dto, name: dto.name?.trim() },
        });
    }
};
exports.MenuService = MenuService;
exports.MenuService = MenuService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService,
        sync_service_1.SyncService])
], MenuService);
//# sourceMappingURL=menu.service.js.map