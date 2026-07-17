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
exports.OptionGroupsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const redis_service_1 = require("../../common/redis/redis.service");
const uuidv7_1 = require("uuidv7");
let OptionGroupsService = class OptionGroupsService {
    constructor(prisma, redis) {
        this.prisma = prisma;
        this.redis = redis;
    }
    async findAll() {
        return this.prisma.optionGroup.findMany({
            include: {
                options: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] },
                menuItems: { select: { id: true, name: true } },
            },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        });
    }
    async findOne(id) {
        const group = await this.prisma.optionGroup.findUnique({
            where: { id },
            include: { options: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }, menuItems: { select: { id: true, name: true } } },
        });
        if (!group)
            throw new common_1.NotFoundException(`Grupo de opções ${id} não encontrado`);
        return group;
    }
    async create(dto) {
        if (!dto.name?.trim())
            throw new common_1.BadRequestException('Nome do grupo é obrigatório');
        const options = dto.options ?? [];
        const group = await this.prisma.optionGroup.create({
            data: {
                id: (0, uuidv7_1.uuidv7)(),
                name: dto.name.trim(),
                minSelect: dto.minSelect ?? 0,
                maxSelect: dto.maxSelect ?? 1,
                options: {
                    create: options.map((o, i) => ({
                        id: (0, uuidv7_1.uuidv7)(), name: o.name.trim(), price: o.price ?? 0, active: o.active ?? true, sortOrder: i,
                    })),
                },
            },
            include: { options: true, menuItems: { select: { id: true, name: true } } },
        });
        await this.redis.invalidateMenu();
        return group;
    }
    async update(id, dto) {
        await this.findOne(id);
        if (dto.name !== undefined && !dto.name.trim())
            throw new common_1.BadRequestException('Nome do grupo é obrigatório');
        const group = await this.prisma.$transaction(async (tx) => {
            if (dto.options) {
                const existing = await tx.menuOption.findMany({ where: { groupId: id }, select: { id: true } });
                const keepIds = new Set(dto.options.filter((o) => o.id).map((o) => o.id));
                const toDelete = existing.filter((o) => !keepIds.has(o.id)).map((o) => o.id);
                if (toDelete.length)
                    await tx.menuOption.deleteMany({ where: { id: { in: toDelete } } });
                for (let i = 0; i < dto.options.length; i++) {
                    const o = dto.options[i];
                    if (o.id) {
                        await tx.menuOption.update({
                            where: { id: o.id },
                            data: { name: o.name.trim(), price: o.price ?? 0, active: o.active ?? true, sortOrder: i },
                        });
                    }
                    else {
                        await tx.menuOption.create({
                            data: { id: (0, uuidv7_1.uuidv7)(), groupId: id, name: o.name.trim(), price: o.price ?? 0, active: o.active ?? true, sortOrder: i },
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
    async remove(id) {
        await this.findOne(id);
        await this.prisma.optionGroup.delete({ where: { id } });
        await this.redis.invalidateMenu();
        return { id };
    }
    async setItems(id, menuItemIds) {
        await this.findOne(id);
        const group = await this.prisma.optionGroup.update({
            where: { id },
            data: { menuItems: { set: menuItemIds.map((itemId) => ({ id: itemId })) } },
            include: { options: true, menuItems: { select: { id: true, name: true } } },
        });
        await this.redis.invalidateMenu();
        return group;
    }
    async updateOption(optionId, dto) {
        const option = await this.prisma.menuOption.findUnique({ where: { id: optionId } });
        if (!option)
            throw new common_1.NotFoundException(`Opção ${optionId} não encontrada`);
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
};
exports.OptionGroupsService = OptionGroupsService;
exports.OptionGroupsService = OptionGroupsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService])
], OptionGroupsService);
//# sourceMappingURL=option-groups.service.js.map