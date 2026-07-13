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
exports.CashService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const uuidv7_1 = require("uuidv7");
const METHODS = ['CASH', 'CARD', 'PIX', 'VOUCHER'];
let CashService = class CashService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getCurrent() {
        const session = await this.prisma.cashSession.findFirst({
            where: { status: 'OPEN' },
            orderBy: { openedAt: 'desc' },
        });
        if (!session)
            return null;
        return this.getSummary(session.id);
    }
    async open(dto) {
        const existing = await this.prisma.cashSession.findFirst({ where: { status: 'OPEN' } });
        if (existing)
            throw new common_1.BadRequestException('Já existe um caixa aberto');
        return this.prisma.cashSession.create({
            data: {
                id: (0, uuidv7_1.uuidv7)(),
                openingAmount: dto.openingAmount ?? 0,
                openingNotes: dto.notes ?? null,
            },
        });
    }
    async addMovement(sessionId, dto) {
        const session = await this.prisma.cashSession.findUnique({ where: { id: sessionId } });
        if (!session)
            throw new common_1.NotFoundException('Caixa não encontrado');
        if (session.status !== 'OPEN')
            throw new common_1.BadRequestException('Caixa não está aberto');
        if (!dto.amount || dto.amount <= 0)
            throw new common_1.BadRequestException('Valor inválido');
        return this.prisma.cashMovement.create({
            data: {
                id: (0, uuidv7_1.uuidv7)(),
                cashSessionId: sessionId,
                type: dto.type,
                amount: dto.amount,
                notes: dto.notes ?? null,
            },
        });
    }
    async getSummary(sessionId) {
        const session = await this.prisma.cashSession.findUnique({ where: { id: sessionId } });
        if (!session)
            throw new common_1.NotFoundException('Caixa não encontrado');
        const [payments, movements] = await Promise.all([
            this.prisma.payment.findMany({ where: { cashSessionId: sessionId } }),
            this.prisma.cashMovement.findMany({ where: { cashSessionId: sessionId }, orderBy: { createdAt: 'desc' } }),
        ]);
        const salesByMethod = {};
        for (const p of payments) {
            salesByMethod[p.method] = (salesByMethod[p.method] ?? 0) + Number(p.amount);
        }
        const withdrawals = movements.filter((m) => m.type === 'WITHDRAWAL').reduce((s, m) => s + Number(m.amount), 0);
        const reinforcements = movements.filter((m) => m.type === 'REINFORCEMENT').reduce((s, m) => s + Number(m.amount), 0);
        const methods = METHODS
            .filter((m) => m === 'CASH' || (salesByMethod[m] ?? 0) > 0)
            .map((method) => {
            const sales = salesByMethod[method] ?? 0;
            if (method === 'CASH') {
                const opening = Number(session.openingAmount);
                const esperado = opening + sales - withdrawals + reinforcements;
                return { method, sales, esperado, opening, withdrawals, reinforcements };
            }
            return { method, sales, esperado: sales, opening: 0, withdrawals: 0, reinforcements: 0 };
        });
        return {
            session,
            elapsedMinutes: Math.floor((Date.now() - session.openedAt.getTime()) / 60000),
            movements,
            methods,
            totalEsperado: methods.reduce((s, m) => s + m.esperado, 0),
        };
    }
    async close(sessionId, dto) {
        const session = await this.prisma.cashSession.findUnique({ where: { id: sessionId } });
        if (!session)
            throw new common_1.NotFoundException('Caixa não encontrado');
        if (session.status !== 'OPEN')
            throw new common_1.BadRequestException('Caixa não está aberto');
        return this.prisma.cashSession.update({
            where: { id: sessionId },
            data: {
                status: 'CLOSED',
                closedAt: new Date(),
                closingNotes: dto.notes ?? null,
                closingCounts: dto.closingCounts ?? {},
            },
        });
    }
};
exports.CashService = CashService;
exports.CashService = CashService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CashService);
//# sourceMappingURL=cash.service.js.map