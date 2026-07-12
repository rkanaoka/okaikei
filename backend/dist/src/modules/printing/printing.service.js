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
var PrintingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrintingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const net = require("net");
const ESC = 0x1b;
const GS = 0x1d;
const CMD = {
    INIT: Buffer.from([ESC, 0x40]),
    ALIGN_CENTER: Buffer.from([ESC, 0x61, 0x01]),
    ALIGN_LEFT: Buffer.from([ESC, 0x61, 0x00]),
    BOLD_ON: Buffer.from([ESC, 0x45, 0x01]),
    BOLD_OFF: Buffer.from([ESC, 0x45, 0x00]),
    DOUBLE_HEIGHT: Buffer.from([ESC, 0x21, 0x10]),
    NORMAL_SIZE: Buffer.from([ESC, 0x21, 0x00]),
    LF: Buffer.from([0x0a]),
    CUT_PARTIAL: Buffer.from([GS, 0x56, 0x01]),
    CUT_FULL: Buffer.from([GS, 0x56, 0x00]),
};
function txt(s) { return Buffer.from(s, 'latin1'); }
function line(c = '-', n = 32) { return txt(c.repeat(n) + '\n'); }
function fmtBRL(v) { return `R$ ${v.toFixed(2).replace('.', ',')}`.padStart(9); }
let PrintingService = PrintingService_1 = class PrintingService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(PrintingService_1.name);
    }
    send(ip, port, data, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const socket = new net.Socket();
            socket.setTimeout(timeout);
            socket.connect(port, ip, () => {
                socket.write(data, (err) => {
                    socket.end();
                    err ? reject(err) : resolve();
                });
            });
            socket.on('timeout', () => { socket.destroy(); reject(new Error(`Timeout ${ip}:${port}`)); });
            socket.on('error', (err) => { socket.destroy(); reject(err); });
        });
    }
    async getPrinter(category) {
        return this.prisma.printer.findUnique({ where: { category } });
    }
    async printOrderItems(comanda, items) {
        const byCategory = {};
        for (const item of items) {
            const cat = item.menuItem?.category ?? item.category;
            if (!byCategory[cat])
                byCategory[cat] = [];
            byCategory[cat].push(item);
        }
        await Promise.allSettled(Object.entries(byCategory).map(async ([cat, catItems]) => {
            const printer = await this.getPrinter(cat);
            if (!printer || !printer.enabled) {
                this.logger.warn(`Impressora ${cat} não configurada ou desativada`);
                return;
            }
            const ticket = this.buildOrderTicket(comanda, catItems, cat);
            await this.send(printer.ip, printer.port, ticket);
            this.logger.log(`Pedido impresso em ${cat} (${printer.ip})`);
        }));
    }
    async printReceipt(comanda, payments, total) {
        const printer = await this.getPrinter('cashier');
        if (!printer || !printer.enabled) {
            this.logger.warn('Impressora caixa não configurada');
            return;
        }
        const ticket = this.buildReceiptTicket(comanda, payments, total);
        await this.send(printer.ip, printer.port, ticket);
        this.logger.log(`Recibo impresso (${printer.ip})`);
    }
    async printTest(category, printer) {
        const label = printer.label ?? category.toUpperCase();
        const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const ticket = Buffer.concat([
            CMD.INIT, CMD.ALIGN_CENTER, CMD.BOLD_ON, CMD.DOUBLE_HEIGHT,
            txt(`BODOGAMI\n`), CMD.NORMAL_SIZE, CMD.BOLD_OFF,
            txt(`TESTE DE IMPRESSORA\n`), line('='),
            CMD.ALIGN_LEFT,
            txt(`Local : ${label}\n`),
            txt(`IP    : ${printer.ip}:${printer.port}\n`),
            txt(`Hora  : ${now}\n`),
            line('='),
            CMD.ALIGN_CENTER, txt(`Impressora OK!\n`),
            CMD.LF, CMD.LF, CMD.CUT_PARTIAL,
        ]);
        await this.send(printer.ip, printer.port, ticket);
        this.logger.log(`Teste impresso em ${label} (${printer.ip})`);
    }
    buildOrderTicket(comanda, items, category) {
        const area = category.toUpperCase();
        const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const parts = [
            CMD.INIT, CMD.ALIGN_CENTER, CMD.BOLD_ON, CMD.DOUBLE_HEIGHT,
            txt(`BODOGAMI\n`), CMD.NORMAL_SIZE, CMD.BOLD_OFF,
            txt(`${area}\n`), line('='),
            CMD.ALIGN_LEFT,
            CMD.BOLD_ON, txt(`Mesa: ${comanda.table?.label ?? '-'}\n`), CMD.BOLD_OFF,
            comanda.customerName ? txt(`Cliente: ${comanda.customerName}\n`) : Buffer.alloc(0),
            txt(`Comanda: #${comanda.number}\n`),
            txt(`${now}\n`), line('-'),
        ];
        for (const item of items) {
            const name = item.menuItem?.name ?? item.name;
            parts.push(CMD.BOLD_ON, txt(`${item.quantity}x  ${name}\n`), CMD.BOLD_OFF);
            if (item.notes)
                parts.push(txt(`    >> ${item.notes}\n`));
        }
        parts.push(line('='), CMD.LF, CMD.LF, CMD.CUT_PARTIAL);
        return Buffer.concat(parts);
    }
    buildReceiptTicket(comanda, payments, total) {
        const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const items = comanda.items ?? [];
        const subtotal = items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0);
        const parts = [
            CMD.INIT, CMD.ALIGN_CENTER, CMD.BOLD_ON, CMD.DOUBLE_HEIGHT,
            txt(`BODOGAMI\n`), CMD.NORMAL_SIZE, CMD.BOLD_OFF,
            txt(`Restaurante Japones\n`), txt(`RECIBO\n`), line('='),
            CMD.ALIGN_LEFT,
            txt(`Mesa: ${comanda.table?.label ?? '-'}\n`),
            comanda.customerName ? txt(`Cliente: ${comanda.customerName}\n`) : Buffer.alloc(0),
            txt(`Comanda: #${comanda.number}   ${now}\n`), line('-'),
        ];
        for (const item of items) {
            const name = (item.menuItem?.name ?? item.name ?? '').slice(0, 20).padEnd(20);
            const qty = `${item.quantity}x`.padStart(3);
            const price = fmtBRL(Number(item.unitPrice) * item.quantity);
            parts.push(txt(`${qty} ${name} ${price}\n`));
        }
        parts.push(line('-'), txt(`${'Subtotal'.padEnd(23)}${fmtBRL(subtotal)}\n`), line('='), CMD.BOLD_ON, txt(`${'TOTAL'.padEnd(23)}${fmtBRL(total)}\n`), CMD.BOLD_OFF, line('-'));
        const methodLabel = { CASH: 'DINHEIRO', CARD: 'CARTAO', PIX: 'PIX', VOUCHER: 'VOUCHER' };
        for (const p of payments) {
            parts.push(txt(`${(methodLabel[p.method] ?? p.method).padEnd(23)}${fmtBRL(Number(p.amount))}\n`));
        }
        parts.push(line('='), CMD.ALIGN_CENTER, txt(`Obrigado pela visita!\n`), txt(`www.bodogami.com.br\n`), CMD.LF, CMD.LF, CMD.CUT_FULL);
        return Buffer.concat(parts);
    }
};
exports.PrintingService = PrintingService;
exports.PrintingService = PrintingService = PrintingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PrintingService);
//# sourceMappingURL=printing.service.js.map