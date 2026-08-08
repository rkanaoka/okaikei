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
exports.PrintingController = void 0;
const common_1 = require("@nestjs/common");
const printing_service_1 = require("../../../modules/printing/application/use-cases/printing.service");
const prisma_service_1 = require("../../../shared/infrastructure/database/prisma.service");
let PrintingController = class PrintingController {
    constructor(printing, prisma) {
        this.printing = printing;
        this.prisma = prisma;
    }
    async test(category) {
        const printer = await this.prisma.printer.findUnique({ where: { category } });
        if (!printer)
            return { ok: false, error: `Impressora '${category}' não encontrada no banco.` };
        if (!printer.enabled)
            return { ok: false, error: `Impressora '${category}' está desativada.` };
        try {
            await this.printing.printTest(category, printer);
            return { ok: true, message: `Teste enviado para ${printer.label} (${printer.ip}:${printer.port})` };
        }
        catch (e) {
            return { ok: false, error: e.message };
        }
    }
    async status() {
        const printers = await this.prisma.printer.findMany({ orderBy: { category: 'asc' } });
        return printers.map(p => ({
            category: p.category,
            label: p.label,
            ip: p.ip,
            port: p.port,
            enabled: p.enabled,
        }));
    }
    async reprint(body) {
        const comanda = await this.prisma.comanda.findUnique({
            where: { id: body.comandaId },
            include: { table: true, items: { include: { menuItem: true } }, payments: true },
        });
        if (!comanda)
            return { ok: false, error: 'Comanda não encontrada' };
        if (body.type === 'receipt') {
            const total = comanda.payments.reduce((s, p) => s + Number(p.amount), 0);
            await this.printing.printReceipt(comanda, comanda.payments, total);
        }
        else {
            await this.printing.printOrderItems(comanda, comanda.items);
        }
        return { ok: true };
    }
};
exports.PrintingController = PrintingController;
__decorate([
    (0, common_1.Post)('test/:category'),
    __param(0, (0, common_1.Param)('category')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PrintingController.prototype, "test", null);
__decorate([
    (0, common_1.Get)('status'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PrintingController.prototype, "status", null);
__decorate([
    (0, common_1.Post)('reprint'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PrintingController.prototype, "reprint", null);
exports.PrintingController = PrintingController = __decorate([
    (0, common_1.Controller)('print'),
    __metadata("design:paramtypes", [printing_service_1.PrintingService,
        prisma_service_1.PrismaService])
], PrintingController);
//# sourceMappingURL=printing.controller.js.map