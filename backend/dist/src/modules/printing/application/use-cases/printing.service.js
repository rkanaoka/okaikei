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
var PrintingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrintingService = void 0;
const common_1 = require("@nestjs/common");
const printer_repository_port_1 = require("../../domain/repositories/printer-repository.port");
const esc_pos_client_port_1 = require("../contracts/esc-pos-client.port");
const print_template_defaults_1 = require("../../../print-templates/application/use-cases/print-template-defaults");
const print_templates_service_1 = require("../../../print-templates/application/use-cases/print-templates.service");
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
function serviceFeeBase(items) {
    return (items ?? []).reduce((s, i) => {
        const eligible = i.menuItem?.chargeServiceFee !== false;
        return eligible ? s + Number(i.unitPrice) * i.quantity : s;
    }, 0);
}
let PrintingService = PrintingService_1 = class PrintingService {
    constructor(printerRepo, escPos, templates) {
        this.printerRepo = printerRepo;
        this.escPos = escPos;
        this.templates = templates;
        this.logger = new common_1.Logger(PrintingService_1.name);
    }
    async getPrinter(category) {
        return this.printerRepo.findByCategory(category);
    }
    async getTemplate(type) {
        const tpl = await this.templates.getEffective(type);
        return { enabled: tpl.enabled, config: tpl.config };
    }
    async printOrderItems(comanda, items) {
        const byCategory = {};
        for (const item of items) {
            const targets = item.menuItem?.printCategories?.length
                ? item.menuItem.printCategories
                : [item.menuItem?.category ?? item.category];
            for (const cat of targets) {
                if (!byCategory[cat])
                    byCategory[cat] = [];
                byCategory[cat].push(item);
            }
        }
        await Promise.allSettled(Object.entries(byCategory).map(async ([cat, catItems]) => {
            const isTemplated = cat === 'kitchen' || cat === 'bar';
            const template = isTemplated
                ? await this.getTemplate(cat)
                : { enabled: true, config: print_template_defaults_1.DEFAULT_CONFIGS.kitchen };
            if (!template.enabled)
                return;
            const printer = await this.getPrinter(cat);
            if (!printer || !printer.enabled) {
                this.logger.warn(`Impressora ${cat} não configurada ou desativada`);
                return;
            }
            const ticket = this.buildOrderTicket(comanda, catItems, cat, template.config);
            await this.escPos.send(printer.ip, printer.port, ticket);
            this.logger.log(`Pedido impresso em ${cat} (${printer.ip})`);
        }));
    }
    async printReceipt(comanda, payments, total) {
        const printer = await this.getPrinter('cashier');
        if (!printer || !printer.enabled) {
            this.logger.warn('Impressora caixa não configurada');
            return;
        }
        const receiptTemplate = await this.getTemplate('receipt');
        if (receiptTemplate.enabled) {
            const ticket = this.buildReceiptTicket(comanda, payments, total, receiptTemplate.config);
            await this.escPos.send(printer.ip, printer.port, ticket);
            this.logger.log(`Recibo impresso (${printer.ip})`);
        }
        const fiscalTemplate = await this.getTemplate('fiscal');
        if (fiscalTemplate.enabled) {
            const fiscalTicket = this.buildFiscalTicket(comanda, payments, total, fiscalTemplate.config);
            await this.escPos.send(printer.ip, printer.port, fiscalTicket);
            this.logger.log(`Cupom fiscal impresso (${printer.ip})`);
        }
    }
    async printSummary(comanda) {
        const printer = await this.getPrinter('cashier');
        if (!printer || !printer.enabled)
            throw new Error(`Impressora 'cashier' não configurada ou desativada`);
        const ticket = this.buildSummaryTicket(comanda);
        await this.escPos.send(printer.ip, printer.port, ticket);
        this.logger.log(`Resumo de conferência impresso (${printer.ip})`);
    }
    async printMergeReceipt(table, snapshot, merged) {
        const printer = await this.getPrinter('cashier');
        if (!printer || !printer.enabled)
            throw new Error(`Impressora 'cashier' não configurada ou desativada`);
        const ticket = this.buildMergeReceiptTicket(table, snapshot, merged);
        await this.escPos.send(printer.ip, printer.port, ticket);
        this.logger.log(`Comprovante de junção impresso (${printer.ip})`);
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
        await this.escPos.send(printer.ip, printer.port, ticket);
        this.logger.log(`Teste impresso em ${label} (${printer.ip})`);
    }
    async printTemplateSample(type, override) {
        if (!(0, print_template_defaults_1.isTemplateType)(type))
            throw new common_1.BadRequestException(`Tipo de modelo inválido: ${type}`);
        const cfg = { ...print_template_defaults_1.DEFAULT_CONFIGS[type], ...(override.config ?? {}) };
        const sampleComanda = {
            number: 42, table: { label: 'Mesa 5' }, customerName: 'Cliente Teste',
            user: { name: 'Garçom Teste' }, surchargeType: 'percent', surchargeValue: 10,
            discountType: 'fixed', discountValue: 2,
        };
        const sampleItems = [
            { quantity: 2, notes: 'sem cebola', unitPrice: 20, menuItem: { name: 'Ramen Shoyu' } },
            { quantity: 1, notes: '', unitPrice: 16, menuItem: { name: 'Cerveja Asahi' } },
        ];
        const samplePayments = [{ method: 'CASH', amount: 56 }];
        const sampleTotal = sampleItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
        const printerCategory = (type === 'receipt' || type === 'fiscal') ? 'cashier' : type;
        const printer = await this.getPrinter(printerCategory);
        if (!printer || !printer.enabled)
            throw new Error(`Impressora '${printerCategory}' não configurada ou desativada`);
        let ticket;
        if (type === 'kitchen' || type === 'bar') {
            ticket = this.buildOrderTicket(sampleComanda, sampleItems, type, cfg);
        }
        else if (type === 'receipt') {
            ticket = this.buildReceiptTicket({ ...sampleComanda, items: sampleItems }, samplePayments, sampleTotal, cfg);
        }
        else {
            ticket = this.buildFiscalTicket(sampleComanda, samplePayments, sampleTotal, cfg);
        }
        await this.escPos.send(printer.ip, printer.port, ticket);
    }
    buildOrderTicket(comanda, items, category, cfg) {
        const area = category.toUpperCase();
        const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const parts = [
            CMD.INIT, CMD.ALIGN_CENTER, CMD.BOLD_ON, CMD.DOUBLE_HEIGHT,
            txt(`BODOGAMI\n`), CMD.NORMAL_SIZE, CMD.BOLD_OFF,
            txt(`${area}\n`), line('='),
            CMD.ALIGN_LEFT,
            CMD.BOLD_ON, txt(`Mesa: ${comanda.table?.label ?? '-'}\n`), CMD.BOLD_OFF,
        ];
        if (cfg.showCliente && comanda.customerName)
            parts.push(txt(`Cliente: ${comanda.customerName}\n`));
        if (cfg.showComanda)
            parts.push(txt(`Comanda: #${comanda.number}\n`));
        if (cfg.showGarcom && comanda.user?.name)
            parts.push(txt(`Garçom: ${comanda.user.name}\n`));
        parts.push(txt(`${now}\n`), line('-'));
        for (const item of items) {
            const name = item.menuItem?.name ?? item.name;
            parts.push(CMD.BOLD_ON, txt(`${item.quantity}x  ${name}\n`), CMD.BOLD_OFF);
            if (cfg.showObservacoes && item.notes)
                parts.push(txt(`    >> ${item.notes}\n`));
        }
        parts.push(line('='));
        if (cfg.footerText)
            parts.push(CMD.ALIGN_CENTER, txt(`${cfg.footerText}\n`), CMD.ALIGN_LEFT);
        parts.push(CMD.LF, CMD.LF, cfg.cutMode === 'full' ? CMD.CUT_FULL : CMD.CUT_PARTIAL);
        return Buffer.concat(parts);
    }
    buildReceiptTicket(comanda, payments, total, cfg) {
        const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const items = comanda.items ?? [];
        const subtotal = items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0);
        const parts = [
            CMD.INIT, CMD.ALIGN_CENTER, CMD.BOLD_ON, CMD.DOUBLE_HEIGHT,
            txt(`${cfg.storeName || 'BODOGAMI'}\n`), CMD.NORMAL_SIZE, CMD.BOLD_OFF,
        ];
        if (cfg.headerText)
            parts.push(txt(`${cfg.headerText}\n`));
        if (cfg.showEndereco && cfg.endereco)
            parts.push(txt(`${cfg.endereco}\n`));
        parts.push(txt(`RECIBO\n`), line('='), CMD.ALIGN_LEFT, txt(`Mesa: ${comanda.table?.label ?? '-'}\n`));
        if (comanda.customerName)
            parts.push(txt(`Cliente: ${comanda.customerName}\n`));
        parts.push(txt(`Comanda: #${comanda.number}   ${now}\n`), line('-'));
        for (const item of items) {
            const name = (item.menuItem?.name ?? item.name ?? '').slice(0, 20).padEnd(20);
            const qty = `${item.quantity}x`.padStart(3);
            const price = fmtBRL(Number(item.unitPrice) * item.quantity);
            parts.push(txt(`${qty} ${name} ${price}\n`));
        }
        parts.push(line('-'), txt(`${'Subtotal'.padEnd(23)}${fmtBRL(subtotal)}\n`));
        if (cfg.showTaxaServico && parseFloat(comanda.surchargeValue) > 0 && comanda.surchargeType) {
            const v = comanda.surchargeType === 'percent'
                ? serviceFeeBase(items) * parseFloat(comanda.surchargeValue) / 100
                : parseFloat(comanda.surchargeValue);
            parts.push(txt(`${'Taxa de servico'.padEnd(23)}${fmtBRL(v)}\n`));
        }
        if (cfg.showDesconto && parseFloat(comanda.discountValue) > 0 && comanda.discountType) {
            const v = comanda.discountType === 'percent'
                ? subtotal * parseFloat(comanda.discountValue) / 100
                : parseFloat(comanda.discountValue);
            parts.push(txt(`${'Desconto'.padEnd(23)}-${fmtBRL(v).trim()}\n`));
        }
        parts.push(line('='), CMD.BOLD_ON, txt(`${'TOTAL'.padEnd(23)}${fmtBRL(total)}\n`), CMD.BOLD_OFF, line('-'));
        const methodLabel = { CASH: 'DINHEIRO', CARD: 'CARTAO', PIX: 'PIX', VOUCHER: 'VOUCHER' };
        for (const p of payments) {
            parts.push(txt(`${(methodLabel[p.method] ?? p.method).padEnd(23)}${fmtBRL(Number(p.amount))}\n`));
        }
        if (cfg.showAssinatura) {
            parts.push(line('-'), CMD.LF, txt('_'.repeat(28) + '\n'), CMD.ALIGN_CENTER, txt('Assinatura cliente\n'), CMD.ALIGN_LEFT);
        }
        parts.push(line('='), CMD.ALIGN_CENTER);
        if (cfg.footerText)
            parts.push(txt(`${cfg.footerText}\n`));
        parts.push(CMD.LF, CMD.LF, cfg.cutMode === 'full' ? CMD.CUT_FULL : CMD.CUT_PARTIAL);
        return Buffer.concat(parts);
    }
    buildFiscalTicket(comanda, payments, total, cfg) {
        const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const parts = [
            CMD.INIT, CMD.ALIGN_CENTER, CMD.BOLD_ON,
            txt(`${cfg.razaoSocial || 'Bodogami Ltda'}\n`), CMD.BOLD_OFF,
            txt(`CNPJ: ${cfg.cnpj || ''}\n`),
        ];
        if (cfg.endereco)
            parts.push(txt(`${cfg.endereco}\n`));
        parts.push(line('='), CMD.BOLD_ON, txt(`CUPOM FISCAL\n`), CMD.BOLD_OFF, line('='), CMD.ALIGN_LEFT, txt(`Comanda: #${comanda.number}   ${now}\n`), line('-'), CMD.ALIGN_CENTER, CMD.BOLD_ON, txt(`${'TOTAL'.padEnd(10)}${fmtBRL(total)}\n`), CMD.BOLD_OFF, line('-'));
        if (cfg.footerText)
            parts.push(txt(`${cfg.footerText}\n`));
        parts.push(CMD.LF, CMD.LF, cfg.cutMode === 'full' ? CMD.CUT_FULL : CMD.CUT_PARTIAL);
        return Buffer.concat(parts);
    }
    buildSummaryTicket(comanda) {
        const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const items = comanda.items ?? [];
        const subtotal = items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0);
        const feeBase = serviceFeeBase(items);
        let total = subtotal;
        const sv = Number(comanda.surchargeValue ?? 0);
        const dv = Number(comanda.discountValue ?? 0);
        if (sv > 0 && comanda.surchargeType)
            total += comanda.surchargeType === 'percent' ? feeBase * sv / 100 : sv;
        if (dv > 0 && comanda.discountType)
            total -= comanda.discountType === 'percent' ? subtotal * dv / 100 : dv;
        const parts = [
            CMD.INIT, CMD.ALIGN_CENTER, CMD.BOLD_ON, CMD.DOUBLE_HEIGHT,
            txt(`BODOGAMI\n`), CMD.NORMAL_SIZE, CMD.BOLD_OFF,
            txt(`RESUMO PARA CONFERENCIA\n`), line('='), CMD.ALIGN_LEFT,
            txt(`Mesa: ${comanda.table?.label ?? '-'}\n`),
        ];
        if (comanda.customerName)
            parts.push(txt(`Cliente: ${comanda.customerName}\n`));
        parts.push(txt(`Comanda: #${comanda.number}   ${now}\n`), line('-'));
        for (const item of items) {
            const name = (item.menuItem?.name ?? item.name ?? '').slice(0, 20).padEnd(20);
            const qty = `${item.quantity}x`.padStart(3);
            const price = fmtBRL(Number(item.unitPrice) * item.quantity);
            parts.push(txt(`${qty} ${name} ${price}\n`));
        }
        parts.push(line('-'), txt(`${'Subtotal'.padEnd(23)}${fmtBRL(subtotal)}\n`));
        if (sv > 0 && comanda.surchargeType) {
            const v = comanda.surchargeType === 'percent' ? feeBase * sv / 100 : sv;
            parts.push(txt(`${'Taxa de servico'.padEnd(23)}${fmtBRL(v)}\n`));
        }
        if (dv > 0 && comanda.discountType) {
            const v = comanda.discountType === 'percent' ? subtotal * dv / 100 : dv;
            parts.push(txt(`${'Desconto'.padEnd(23)}-${fmtBRL(v).trim()}\n`));
        }
        parts.push(line('='), CMD.BOLD_ON, txt(`${'TOTAL PARCIAL'.padEnd(23)}${fmtBRL(total)}\n`), CMD.BOLD_OFF, line('='), CMD.ALIGN_CENTER, txt(`Documento sem valor fiscal\n`), txt(`Apenas para conferencia\n`), CMD.LF, CMD.LF, CMD.CUT_PARTIAL);
        return Buffer.concat(parts);
    }
    buildMergeReceiptTicket(table, snapshot, merged) {
        const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const parts = [
            CMD.INIT, CMD.ALIGN_CENTER, CMD.BOLD_ON, CMD.DOUBLE_HEIGHT,
            txt(`BODOGAMI\n`), CMD.NORMAL_SIZE, CMD.BOLD_OFF,
            txt(`COMPROVANTE DE JUNCAO\n`), line('='), CMD.ALIGN_LEFT,
            txt(`Mesa: ${table?.label ?? '-'}\n`), txt(`${now}\n`), line('-'),
        ];
        for (const c of snapshot) {
            parts.push(CMD.BOLD_ON, txt(`Comanda #${c.number}${c.customerName ? ' - ' + c.customerName : ''}\n`), CMD.BOLD_OFF);
            for (const item of c.items) {
                parts.push(txt(`  ${item.quantity}x  ${item.name}\n`));
                if (item.notes)
                    parts.push(txt(`      >> ${item.notes}\n`));
            }
            parts.push(txt(`  Subtotal: ${fmtBRL(c.subtotal)}\n`), line('-'));
        }
        const mergedSubtotal = (merged.items ?? []).reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0);
        parts.push(CMD.BOLD_ON, txt(`Comandas unificadas em #${merged.number}\n`), CMD.BOLD_OFF, txt(`Novo subtotal total: ${fmtBRL(mergedSubtotal)}\n`), line('='), CMD.ALIGN_CENTER, txt(`Comprovante interno - sem valor fiscal\n`), CMD.LF, CMD.LF, CMD.CUT_PARTIAL);
        return Buffer.concat(parts);
    }
};
exports.PrintingService = PrintingService;
exports.PrintingService = PrintingService = PrintingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(printer_repository_port_1.PRINTER_REPOSITORY_PORT)),
    __param(1, (0, common_1.Inject)(esc_pos_client_port_1.ESC_POS_CLIENT_PORT)),
    __metadata("design:paramtypes", [Object, Object, print_templates_service_1.PrintTemplatesService])
], PrintingService);
//# sourceMappingURL=printing.service.js.map