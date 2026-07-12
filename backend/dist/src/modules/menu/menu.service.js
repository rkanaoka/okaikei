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
            orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
        });
        if (!includeUnavailable)
            await this.redis.cacheMenu(items);
        return items;
    }
    async findOne(id) {
        const item = await this.prisma.menuItem.findUnique({ where: { id } });
        if (!item)
            throw new common_1.NotFoundException(`Item ${id} não encontrado`);
        return item;
    }
    async create(dto) {
        const item = await this.prisma.menuItem.create({
            data: { id: (0, uuidv7_1.uuidv7)(), ...dto },
        });
        await this.redis.invalidateMenu();
        await this.sync.enqueue('menu.item_created', 'MenuItem', item.id, item);
        return item;
    }
    async update(id, dto) {
        await this.findOne(id);
        const item = await this.prisma.menuItem.update({ where: { id }, data: dto });
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
};
exports.MenuService = MenuService;
exports.MenuService = MenuService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService,
        sync_service_1.SyncService])
], MenuService);
//# sourceMappingURL=menu.service.js.map