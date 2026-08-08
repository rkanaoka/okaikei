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
exports.PrismaOptionGroupRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../../shared/infrastructure/database/prisma.service");
const uuidv7_1 = require("uuidv7");
const WITH_ITEMS = {
    options: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] },
    menuItems: { select: { id: true, name: true } },
};
let PrismaOptionGroupRepository = class PrismaOptionGroupRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll() {
        return this.prisma.optionGroup.findMany({
            include: WITH_ITEMS,
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        });
    }
    async findById(id) {
        return this.prisma.optionGroup.findUnique({ where: { id }, include: WITH_ITEMS });
    }
    async create(data) {
        const { options, ...rest } = data;
        return this.prisma.optionGroup.create({
            data: {
                ...rest,
                ...(options ? { options: { create: options } } : {}),
            },
            include: WITH_ITEMS,
        });
    }
    async updateWithOptions(id, data) {
        return this.prisma.$transaction(async (tx) => {
            if (data.options) {
                const existing = await tx.menuOption.findMany({ where: { groupId: id }, select: { id: true } });
                const keepIds = new Set(data.options.filter((o) => o.id).map((o) => o.id));
                const toDelete = existing.filter((o) => !keepIds.has(o.id)).map((o) => o.id);
                if (toDelete.length)
                    await tx.menuOption.deleteMany({ where: { id: { in: toDelete } } });
                for (let i = 0; i < data.options.length; i++) {
                    const o = data.options[i];
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
            const { options: _opts, ...rest } = data;
            return tx.optionGroup.update({
                where: { id },
                data: rest,
                include: WITH_ITEMS,
            });
        });
    }
    async remove(id) {
        return this.prisma.optionGroup.delete({ where: { id } });
    }
    async setMenuItems(id, menuItemIds) {
        return this.prisma.optionGroup.update({
            where: { id },
            data: { menuItems: { set: menuItemIds.map((itemId) => ({ id: itemId })) } },
            include: WITH_ITEMS,
        });
    }
    async updateOption(optionId, data) {
        return this.prisma.menuOption.update({ where: { id: optionId }, data });
    }
    async findOptionById(optionId) {
        return this.prisma.menuOption.findUnique({ where: { id: optionId } });
    }
};
exports.PrismaOptionGroupRepository = PrismaOptionGroupRepository;
exports.PrismaOptionGroupRepository = PrismaOptionGroupRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PrismaOptionGroupRepository);
//# sourceMappingURL=prisma-option-group.repository.js.map