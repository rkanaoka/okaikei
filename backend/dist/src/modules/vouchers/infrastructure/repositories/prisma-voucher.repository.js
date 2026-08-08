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
exports.PrismaVoucherRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../../shared/infrastructure/database/prisma.service");
let PrismaVoucherRepository = class PrismaVoucherRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    get v() { return this.prisma.voucher; }
    async findAll(filter) {
        const where = {};
        if (filter?.status)
            where.status = filter.status;
        if (filter?.search) {
            const s = filter.search;
            where.OR = [
                { customerName: { contains: s, mode: 'insensitive' } },
                { code: { contains: s, mode: 'insensitive' } },
            ];
        }
        return this.v.findMany({ where, orderBy: { createdAt: 'desc' } });
    }
    async findById(id) {
        return this.v.findUnique({ where: { id } });
    }
    async findByCode(code) {
        return this.v.findFirst({ where: { code } });
    }
    async create(data) {
        const { password, ...rest } = data;
        return this.v.create({ data: { ...rest, confirmationPassword: password } });
    }
    async update(id, data) {
        return this.v.update({ where: { id }, data });
    }
    async updateStatus(id, status) {
        return this.v.update({ where: { id }, data: { status } });
    }
};
exports.PrismaVoucherRepository = PrismaVoucherRepository;
exports.PrismaVoucherRepository = PrismaVoucherRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PrismaVoucherRepository);
//# sourceMappingURL=prisma-voucher.repository.js.map