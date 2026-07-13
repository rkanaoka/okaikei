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
exports.PrintTemplatesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const uuidv7_1 = require("uuidv7");
const print_template_defaults_1 = require("./print-template-defaults");
let PrintTemplatesService = class PrintTemplatesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    merge(type, row) {
        return {
            type,
            label: print_template_defaults_1.TEMPLATE_LABELS[type],
            enabled: row?.enabled ?? print_template_defaults_1.DEFAULT_ENABLED[type],
            config: { ...print_template_defaults_1.DEFAULT_CONFIGS[type], ...(row?.config ?? {}) },
        };
    }
    async list() {
        const rows = await this.prisma.printTemplate.findMany();
        const byType = new Map(rows.map((r) => [r.type, r]));
        return print_template_defaults_1.TEMPLATE_TYPES.map((t) => this.merge(t, byType.get(t) ?? null));
    }
    async get(type) {
        if (!(0, print_template_defaults_1.isTemplateType)(type))
            throw new common_1.BadRequestException(`Tipo de modelo inválido: ${type}`);
        const row = await this.prisma.printTemplate.findUnique({ where: { type } });
        return this.merge(type, row);
    }
    async update(type, dto) {
        if (!(0, print_template_defaults_1.isTemplateType)(type))
            throw new common_1.BadRequestException(`Tipo de modelo inválido: ${type}`);
        const current = await this.get(type);
        const nextConfig = { ...current.config, ...(dto.config ?? {}) };
        const nextEnabled = dto.enabled ?? current.enabled;
        const row = await this.prisma.printTemplate.upsert({
            where: { type },
            update: { enabled: nextEnabled, config: nextConfig },
            create: { id: (0, uuidv7_1.uuidv7)(), type, enabled: nextEnabled, config: nextConfig },
        });
        return this.merge(type, row);
    }
    async reset(type) {
        if (!(0, print_template_defaults_1.isTemplateType)(type))
            throw new common_1.BadRequestException(`Tipo de modelo inválido: ${type}`);
        const row = await this.prisma.printTemplate.upsert({
            where: { type },
            update: { enabled: print_template_defaults_1.DEFAULT_ENABLED[type], config: print_template_defaults_1.DEFAULT_CONFIGS[type] },
            create: { id: (0, uuidv7_1.uuidv7)(), type, enabled: print_template_defaults_1.DEFAULT_ENABLED[type], config: print_template_defaults_1.DEFAULT_CONFIGS[type] },
        });
        return this.merge(type, row);
    }
    async getEffective(type) {
        return this.get(type);
    }
};
exports.PrintTemplatesService = PrintTemplatesService;
exports.PrintTemplatesService = PrintTemplatesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PrintTemplatesService);
//# sourceMappingURL=print-templates.service.js.map