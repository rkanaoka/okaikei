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
exports.PrismaReasonsRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../../shared/infrastructure/database/prisma.service");
let PrismaReasonsRepository = class PrismaReasonsRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAllCancellationReasons() {
        return this.prisma.cancellationReason.findMany({ orderBy: { createdAt: 'asc' } });
    }
    async findCancellationUsageCounts() {
        const counts = await this.prisma.cancellation.groupBy({
            by: ['reasonId'],
            _count: { _all: true },
        });
        return counts.map((c) => ({ reasonId: c.reasonId, count: c._count._all }));
    }
    async createCancellationReason(data) {
        return this.prisma.cancellationReason.create({ data });
    }
    async deleteCancellationReason(id) {
        return this.prisma.cancellationReason.delete({ where: { id } });
    }
    async findCancellationHistory() {
        return this.prisma.cancellation.findMany({
            include: { reason: true },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findAllDiscountReasons() {
        return this.prisma.discountReason.findMany({ orderBy: { createdAt: 'asc' } });
    }
    async findDiscountUsageCounts() {
        const counts = await this.prisma.comanda.groupBy({
            by: ['discountReasonId'],
            _count: { _all: true },
            where: { discountReasonId: { not: null } },
        });
        return counts.map((c) => ({ reasonId: c.discountReasonId, count: c._count._all }));
    }
    async createDiscountReason(data) {
        return this.prisma.discountReason.create({ data });
    }
    async deleteDiscountReason(id) {
        return this.prisma.discountReason.delete({ where: { id } });
    }
};
exports.PrismaReasonsRepository = PrismaReasonsRepository;
exports.PrismaReasonsRepository = PrismaReasonsRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PrismaReasonsRepository);
//# sourceMappingURL=prisma-reasons.repository.js.map