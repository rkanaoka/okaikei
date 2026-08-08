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
exports.PrismaPrintTemplateRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../../shared/infrastructure/database/prisma.service");
const uuidv7_1 = require("uuidv7");
let PrismaPrintTemplateRepository = class PrismaPrintTemplateRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll() {
        return this.prisma.printTemplate.findMany();
    }
    async findByType(type) {
        return this.prisma.printTemplate.findUnique({ where: { type } });
    }
    async upsert(type, data) {
        return this.prisma.printTemplate.upsert({
            where: { type },
            update: { enabled: data.enabled, config: data.config },
            create: { id: (0, uuidv7_1.uuidv7)(), type, enabled: data.enabled, config: data.config },
        });
    }
};
exports.PrismaPrintTemplateRepository = PrismaPrintTemplateRepository;
exports.PrismaPrintTemplateRepository = PrismaPrintTemplateRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PrismaPrintTemplateRepository);
//# sourceMappingURL=prisma-print-template.repository.js.map