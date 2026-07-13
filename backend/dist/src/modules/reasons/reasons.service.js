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
exports.ReasonsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const uuidv7_1 = require("uuidv7");
let ReasonsService = class ReasonsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listCancellationReasons() {
        const [reasons, counts] = await Promise.all([
            this.prisma.cancellationReason.findMany({ orderBy: { createdAt: 'asc' } }),
            this.prisma.cancellation.groupBy({ by: ['reasonId'], _count: { _all: true } }),
        ]);
        const countMap = new Map(counts.map((c) => [c.reasonId, c._count._all]));
        return reasons.map((r) => ({ ...r, usageCount: countMap.get(r.id) ?? 0 }));
    }
    async createCancellationReason(dto) {
        if (!dto.label?.trim())
            throw new common_1.BadRequestException('Nome do motivo é obrigatório');
        return this.prisma.cancellationReason.create({
            data: { id: (0, uuidv7_1.uuidv7)(), label: dto.label.trim() },
        });
    }
    async listCancellationHistory() {
        return this.prisma.cancellation.findMany({
            include: { reason: true },
            orderBy: { createdAt: 'desc' },
            take: 200,
        });
    }
    async listDiscountReasons() {
        return this.prisma.discountReason.findMany({ orderBy: { createdAt: 'asc' } });
    }
    async createDiscountReason(dto) {
        if (!dto.label?.trim())
            throw new common_1.BadRequestException('Nome do motivo é obrigatório');
        if (!dto.value || dto.value <= 0)
            throw new common_1.BadRequestException('Valor inválido');
        if (dto.type !== 'percent' && dto.type !== 'fixed')
            throw new common_1.BadRequestException('Tipo inválido');
        return this.prisma.discountReason.create({
            data: { id: (0, uuidv7_1.uuidv7)(), label: dto.label.trim(), type: dto.type, value: dto.value },
        });
    }
};
exports.ReasonsService = ReasonsService;
exports.ReasonsService = ReasonsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReasonsService);
//# sourceMappingURL=reasons.service.js.map