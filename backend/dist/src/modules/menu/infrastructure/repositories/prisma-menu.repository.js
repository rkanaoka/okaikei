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
exports.PrismaMenuRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../../shared/infrastructure/database/prisma.service");
const OPTION_GROUPS_INCLUDE = {
    optionGroups: {
        where: { active: true },
        include: { options: { where: { active: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] } },
    },
};
let PrismaMenuRepository = class PrismaMenuRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAllItems(filter) {
        return this.prisma.menuItem.findMany({
            where: filter?.available !== undefined ? { available: filter.available } : {},
            include: { menuCategory: true, ...OPTION_GROUPS_INCLUDE },
            orderBy: [{ menuCategory: { sortOrder: 'asc' } }, { sortOrder: 'asc' }, { name: 'asc' }],
        });
    }
    async findItemById(id) {
        return this.prisma.menuItem.findUnique({
            where: { id },
            include: { menuCategory: true, ...OPTION_GROUPS_INCLUDE },
        });
    }
    async createItem(data) {
        const { optionGroupIds, ...rest } = data;
        return this.prisma.menuItem.create({
            data: {
                ...rest,
                optionGroupOrder: optionGroupIds ?? [],
                ...(optionGroupIds ? { optionGroups: { connect: optionGroupIds.map((gid) => ({ id: gid })) } } : {}),
            },
            include: { menuCategory: true },
        });
    }
    async updateItem(id, data) {
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
    async deactivateItem(id) {
        return this.prisma.menuItem.update({ where: { id }, data: { available: false } });
    }
    async findAllCategories() {
        return this.prisma.menuCategory.findMany({ orderBy: { sortOrder: 'asc' } });
    }
    async findCategoryById(id) {
        return this.prisma.menuCategory.findUnique({ where: { id } });
    }
    async createCategory(data) {
        return this.prisma.menuCategory.create({ data });
    }
    async updateCategory(id, data) {
        return this.prisma.menuCategory.update({ where: { id }, data });
    }
};
exports.PrismaMenuRepository = PrismaMenuRepository;
exports.PrismaMenuRepository = PrismaMenuRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PrismaMenuRepository);
//# sourceMappingURL=prisma-menu.repository.js.map