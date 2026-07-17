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
exports.VouchersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const uuidv7_1 = require("uuidv7");
const crypto_1 = require("crypto");
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const STATUSES = ['NEGOTIATION', 'PAID', 'USED', 'CANCELLED', 'EXPIRED'];
const STATUS_LABELS = {
    NEGOTIATION: 'Negociação', PAID: 'Pago', USED: 'Usado', CANCELLED: 'Cancelado', EXPIRED: 'Vencido',
};
function generateCode() {
    let code = '';
    for (let i = 0; i < 8; i++)
        code += CODE_ALPHABET[(0, crypto_1.randomInt)(CODE_ALPHABET.length)];
    return code;
}
function generatePassword() {
    return String((0, crypto_1.randomInt)(0, 1_000_000)).padStart(6, '0');
}
function isValidCpf(raw) {
    const cpf = raw.replace(/\D/g, '');
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf))
        return false;
    for (let t = 9; t < 11; t++) {
        let sum = 0;
        for (let i = 0; i < t; i++)
            sum += parseInt(cpf[i], 10) * (t + 1 - i);
        const digit = ((sum * 10) % 11) % 10;
        if (digit !== parseInt(cpf[t], 10))
            return false;
    }
    return true;
}
let VouchersService = class VouchersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list() {
        return this.prisma.voucher.findMany({ orderBy: { createdAt: 'desc' } });
    }
    async findByCode(rawCode) {
        const code = rawCode.trim().toUpperCase();
        const voucher = await this.prisma.voucher.findUnique({ where: { code } });
        if (!voucher)
            throw new common_1.NotFoundException('Voucher não encontrado');
        return {
            id: voucher.id, code: voucher.code, amount: voucher.amount,
            dueDate: voucher.dueDate, status: voucher.status,
        };
    }
    async confirmForUse(id, password) {
        const voucher = await this.prisma.voucher.findUnique({ where: { id } });
        if (!voucher)
            throw new common_1.NotFoundException('Voucher não encontrado');
        if (voucher.status !== 'PAID') {
            throw new common_1.BadRequestException(`Este voucher está com status "${STATUS_LABELS[voucher.status] ?? voucher.status}" e não pode ser usado`);
        }
        if (!password || voucher.confirmationPassword !== password) {
            throw new common_1.BadRequestException('Senha de confirmação incorreta');
        }
        return {
            id: voucher.id, code: voucher.code, amount: voucher.amount,
            dueDate: voucher.dueDate, status: voucher.status,
        };
    }
    validate(dto, { partial }) {
        if (!partial || dto.customerName !== undefined) {
            if (!dto.customerName?.trim())
                throw new common_1.BadRequestException('Nome do cliente é obrigatório');
        }
        if (!partial || dto.customerCpf !== undefined) {
            if (!isValidCpf(dto.customerCpf ?? ''))
                throw new common_1.BadRequestException('CPF inválido');
        }
        if (!partial || dto.customerBirthDate !== undefined) {
            if (!dto.customerBirthDate || isNaN(Date.parse(dto.customerBirthDate)))
                throw new common_1.BadRequestException('Data de nascimento inválida');
        }
        if (!partial || dto.customerAddress !== undefined) {
            if (!dto.customerAddress?.trim())
                throw new common_1.BadRequestException('Endereço é obrigatório');
        }
        if (!partial || dto.customerPhone !== undefined) {
            if ((dto.customerPhone ?? '').replace(/\D/g, '').length < 10)
                throw new common_1.BadRequestException('Telefone inválido');
        }
        if (!partial || dto.customerEmail !== undefined) {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dto.customerEmail ?? ''))
                throw new common_1.BadRequestException('E-mail inválido');
        }
        if (!partial || dto.amount !== undefined) {
            if (!dto.amount || dto.amount <= 0)
                throw new common_1.BadRequestException('Valor do voucher inválido');
        }
        if (!partial || dto.dueDate !== undefined) {
            if (!dto.dueDate || isNaN(Date.parse(dto.dueDate)))
                throw new common_1.BadRequestException('Data de vencimento inválida');
        }
        if (dto.status !== undefined && !STATUSES.includes(dto.status)) {
            throw new common_1.BadRequestException('Status inválido');
        }
    }
    async create(dto) {
        this.validate(dto, { partial: false });
        for (let attempt = 0; attempt < 5; attempt++) {
            try {
                return await this.prisma.voucher.create({
                    data: {
                        id: (0, uuidv7_1.uuidv7)(),
                        code: generateCode(),
                        confirmationPassword: generatePassword(),
                        customerName: dto.customerName.trim(),
                        customerCpf: dto.customerCpf.replace(/\D/g, ''),
                        customerBirthDate: new Date(dto.customerBirthDate),
                        customerAddress: dto.customerAddress.trim(),
                        customerPhone: dto.customerPhone.replace(/\D/g, ''),
                        customerEmail: dto.customerEmail.trim(),
                        amount: dto.amount,
                        dueDate: new Date(dto.dueDate),
                        status: dto.status ?? 'NEGOTIATION',
                    },
                });
            }
            catch (e) {
                if (e.code === 'P2002' && attempt < 4)
                    continue;
                throw e;
            }
        }
        throw new common_1.BadRequestException('Não foi possível gerar um código único para o voucher');
    }
    async update(id, dto) {
        const existing = await this.prisma.voucher.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('Voucher não encontrado');
        this.validate(dto, { partial: true });
        return this.prisma.voucher.update({
            where: { id },
            data: {
                ...(dto.customerName !== undefined && { customerName: dto.customerName.trim() }),
                ...(dto.customerCpf !== undefined && { customerCpf: dto.customerCpf.replace(/\D/g, '') }),
                ...(dto.customerBirthDate !== undefined && { customerBirthDate: new Date(dto.customerBirthDate) }),
                ...(dto.customerAddress !== undefined && { customerAddress: dto.customerAddress.trim() }),
                ...(dto.customerPhone !== undefined && { customerPhone: dto.customerPhone.replace(/\D/g, '') }),
                ...(dto.customerEmail !== undefined && { customerEmail: dto.customerEmail.trim() }),
                ...(dto.amount !== undefined && { amount: dto.amount }),
                ...(dto.dueDate !== undefined && { dueDate: new Date(dto.dueDate) }),
                ...(dto.status !== undefined && { status: dto.status }),
            },
        });
    }
};
exports.VouchersService = VouchersService;
exports.VouchersService = VouchersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], VouchersService);
//# sourceMappingURL=vouchers.service.js.map