import { Inject, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { VOUCHER_REPOSITORY_PORT, VoucherRepositoryPort } from '@/modules/vouchers/domain/repositories/voucher-repository.port';
import { uuidv7 } from 'uuidv7';
import { randomInt } from 'crypto';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const STATUSES = ['NEGOTIATION', 'PAID', 'USED', 'CANCELLED', 'EXPIRED'];
const STATUS_LABELS: Record<string, string> = {
  NEGOTIATION: 'Negociação', PAID: 'Pago', USED: 'Usado', CANCELLED: 'Cancelado', EXPIRED: 'Vencido',
};

type VoucherInput = {
  customerName: string; customerCpf: string; customerBirthDate: string;
  customerAddress: string; customerPhone: string; customerEmail: string;
  amount: number; dueDate: string; status?: string;
};

function generateCode(): string {
  let code = '';
  for (let i = 0; i < 8; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

function generatePassword(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

function isValidCpf(raw: string): boolean {
  const cpf = raw.replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  for (let t = 9; t < 11; t++) {
    let sum = 0;
    for (let i = 0; i < t; i++) sum += parseInt(cpf[i], 10) * (t + 1 - i);
    const digit = ((sum * 10) % 11) % 10;
    if (digit !== parseInt(cpf[t], 10)) return false;
  }
  return true;
}

@Injectable()
export class VouchersService {
  constructor(
    @Inject(VOUCHER_REPOSITORY_PORT) private readonly repo: VoucherRepositoryPort,
  ) {}

  async list() {
    return this.repo.findAll();
  }

  async findByCode(rawCode: string) {
    const code = rawCode.trim().toUpperCase();
    const voucher = await this.repo.findByCode(code);
    if (!voucher) throw new NotFoundException('Voucher não encontrado');
    return { id: voucher.id, code: voucher.code, amount: voucher.amount, dueDate: voucher.dueDate, status: voucher.status };
  }

  async confirmForUse(id: string, password: string) {
    const voucher = await this.repo.findById(id);
    if (!voucher) throw new NotFoundException('Voucher não encontrado');
    if (voucher.status !== 'PAID') {
      throw new BadRequestException(`Este voucher está com status "${STATUS_LABELS[voucher.status] ?? voucher.status}" e não pode ser usado`);
    }
    if (!password || voucher.confirmationPassword !== password) {
      throw new BadRequestException('Senha de confirmação incorreta');
    }
    return { id: voucher.id, code: voucher.code, amount: voucher.amount, dueDate: voucher.dueDate, status: voucher.status };
  }

  private validate(dto: Partial<VoucherInput>, { partial }: { partial: boolean }) {
    if (!partial || dto.customerName !== undefined)
      if (!dto.customerName?.trim()) throw new BadRequestException('Nome do cliente é obrigatório');
    if (!partial || dto.customerCpf !== undefined)
      if (!isValidCpf(dto.customerCpf ?? '')) throw new BadRequestException('CPF inválido');
    if (!partial || dto.customerBirthDate !== undefined)
      if (!dto.customerBirthDate || isNaN(Date.parse(dto.customerBirthDate)))
        throw new BadRequestException('Data de nascimento inválida');
    if (!partial || dto.customerAddress !== undefined)
      if (!dto.customerAddress?.trim()) throw new BadRequestException('Endereço é obrigatório');
    if (!partial || dto.customerPhone !== undefined)
      if ((dto.customerPhone ?? '').replace(/\D/g, '').length < 10) throw new BadRequestException('Telefone inválido');
    if (!partial || dto.customerEmail !== undefined)
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dto.customerEmail ?? '')) throw new BadRequestException('E-mail inválido');
    if (!partial || dto.amount !== undefined)
      if (!dto.amount || dto.amount <= 0) throw new BadRequestException('Valor do voucher inválido');
    if (!partial || dto.dueDate !== undefined)
      if (!dto.dueDate || isNaN(Date.parse(dto.dueDate))) throw new BadRequestException('Data de vencimento inválida');
    if (dto.status !== undefined && !STATUSES.includes(dto.status))
      throw new BadRequestException('Status inválido');
  }

  async create(dto: VoucherInput) {
    this.validate(dto, { partial: false });
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        return await this.repo.create({
          id: uuidv7(),
          code: generateCode(),
          password: generatePassword(),
          customerName:      dto.customerName.trim(),
          customerCpf:       dto.customerCpf.replace(/\D/g, ''),
          customerBirthDate: new Date(dto.customerBirthDate),
          customerAddress:   dto.customerAddress.trim(),
          customerPhone:     dto.customerPhone.replace(/\D/g, ''),
          customerEmail:     dto.customerEmail.trim(),
          amount:  dto.amount,
          dueDate: new Date(dto.dueDate),
          status:  (dto.status ?? 'NEGOTIATION'),
        });
      } catch (e: any) {
        if (e.code === 'P2002' && attempt < 4) continue;
        throw e;
      }
    }
    throw new BadRequestException('Não foi possível gerar um código único para o voucher');
  }

  async update(id: string, dto: Partial<VoucherInput>) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('Voucher não encontrado');
    this.validate(dto, { partial: true });
    return this.repo.update(id, {
      ...(dto.customerName !== undefined      && { customerName: dto.customerName.trim() }),
      ...(dto.customerCpf !== undefined        && { customerCpf: dto.customerCpf.replace(/\D/g, '') }),
      ...(dto.customerBirthDate !== undefined  && { customerBirthDate: new Date(dto.customerBirthDate) }),
      ...(dto.customerAddress !== undefined    && { customerAddress: dto.customerAddress.trim() }),
      ...(dto.customerPhone !== undefined      && { customerPhone: dto.customerPhone.replace(/\D/g, '') }),
      ...(dto.customerEmail !== undefined      && { customerEmail: dto.customerEmail.trim() }),
      ...(dto.amount !== undefined             && { amount: dto.amount }),
      ...(dto.dueDate !== undefined            && { dueDate: new Date(dto.dueDate) }),
      ...(dto.status !== undefined             && { status: dto.status }),
    });
  }
}
