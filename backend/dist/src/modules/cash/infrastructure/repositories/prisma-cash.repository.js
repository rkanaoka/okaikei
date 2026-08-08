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
exports.PrismaCashRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../../shared/infrastructure/database/prisma.service");
let PrismaCashRepository = class PrismaCashRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listSessions(filter) {
        const where = {};
        if (filter?.from || filter?.to) {
            where.openedAt = {};
            if (filter.from)
                where.openedAt.gte = filter.from;
            if (filter.to)
                where.openedAt.lte = filter.to;
        }
        return this.prisma.cashSession.findMany({ where, orderBy: { openedAt: 'desc' } });
    }
    async findSessionById(id) {
        return this.prisma.cashSession.findUnique({ where: { id } });
    }
    async findOpenSession() {
        return this.prisma.cashSession.findFirst({
            where: { status: 'OPEN' },
            orderBy: { openedAt: 'desc' },
        });
    }
    async createSession(data) {
        return this.prisma.cashSession.create({ data });
    }
    async closeSession(id, data) {
        return this.prisma.cashSession.update({
            where: { id },
            data: {
                status: 'CLOSED',
                closedAt: new Date(),
                closingNotes: data.notes ?? null,
                closingCounts: data.closingCounts ?? {},
            },
        });
    }
    async getSessionPayments(sessionId) {
        return this.prisma.payment.findMany({ where: { cashSessionId: sessionId } });
    }
    async getSessionMovements(sessionId) {
        return this.prisma.cashMovement.findMany({
            where: { cashSessionId: sessionId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async addMovement(data) {
        return this.prisma.cashMovement.create({ data });
    }
};
exports.PrismaCashRepository = PrismaCashRepository;
exports.PrismaCashRepository = PrismaCashRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PrismaCashRepository);
//# sourceMappingURL=prisma-cash.repository.js.map