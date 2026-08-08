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
exports.CashService = void 0;
const common_1 = require("@nestjs/common");
const cash_repository_port_1 = require("../../domain/repositories/cash-repository.port");
const uuidv7_1 = require("uuidv7");
const METHODS = ['CASH', 'CARD', 'PIX', 'VOUCHER'];
let CashService = class CashService {
    constructor(repo) {
        this.repo = repo;
    }
    async list(dto) {
        const filter = {};
        if (dto.from)
            filter.from = new Date(dto.from);
        if (dto.to)
            filter.to = new Date(`${dto.to}T23:59:59.999`);
        const sessions = await this.repo.listSessions(Object.keys(filter).length ? filter : undefined);
        return Promise.all(sessions.map((s) => this.withDivergence(s)));
    }
    async withDivergence(session) {
        if (session.status !== 'CLOSED')
            return { ...session, divergence: null };
        const summary = await this.getSummary(session.id);
        const counts = session.closingCounts ?? {};
        let hasDivergence = false;
        let total = 0;
        const methods = summary.methods.map((m) => {
            const emCaixa = Number(counts[m.method] ?? 0);
            const diff = emCaixa - m.esperado;
            if (Math.abs(diff) > 0.01)
                hasDivergence = true;
            total += diff;
            return { method: m.method, esperado: m.esperado, emCaixa, diff };
        });
        return { ...session, divergence: { hasDivergence, total, methods } };
    }
    async getCurrent() {
        const session = await this.repo.findOpenSession();
        if (!session)
            return null;
        return this.getSummary(session.id);
    }
    async open(dto) {
        const existing = await this.repo.findOpenSession();
        if (existing)
            throw new common_1.BadRequestException('Já existe um caixa aberto');
        return this.repo.createSession({ id: (0, uuidv7_1.uuidv7)(), openingAmount: dto.openingAmount ?? 0, openingNotes: dto.notes });
    }
    async addMovement(sessionId, dto) {
        const session = await this.repo.findSessionById(sessionId);
        if (!session)
            throw new common_1.NotFoundException('Caixa não encontrado');
        if (session.status !== 'OPEN')
            throw new common_1.BadRequestException('Caixa não está aberto');
        if (!dto.amount || dto.amount <= 0)
            throw new common_1.BadRequestException('Valor inválido');
        return this.repo.addMovement({
            id: (0, uuidv7_1.uuidv7)(), cashSessionId: sessionId,
            type: dto.type, amount: dto.amount, notes: dto.notes ?? null,
        });
    }
    async getSummary(sessionId) {
        const session = await this.repo.findSessionById(sessionId);
        if (!session)
            throw new common_1.NotFoundException('Caixa não encontrado');
        const [payments, movements] = await Promise.all([
            this.repo.getSessionPayments(sessionId),
            this.repo.getSessionMovements(sessionId),
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
        const session = await this.repo.findSessionById(sessionId);
        if (!session)
            throw new common_1.NotFoundException('Caixa não encontrado');
        if (session.status !== 'OPEN')
            throw new common_1.BadRequestException('Caixa não está aberto');
        return this.repo.closeSession(sessionId, { closingCounts: dto.closingCounts, notes: dto.notes });
    }
};
exports.CashService = CashService;
exports.CashService = CashService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(cash_repository_port_1.CASH_REPOSITORY_PORT)),
    __metadata("design:paramtypes", [Object])
], CashService);
//# sourceMappingURL=cash.service.js.map