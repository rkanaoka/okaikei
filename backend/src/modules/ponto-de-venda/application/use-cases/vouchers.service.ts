import { Inject, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { VOUCHER_REPOSITORY_PORT, VoucherRepositoryPort } from '@/modules/ponto-de-venda/domain/repositories/voucher-repository.port';
import { MENU_REPOSITORY_PORT, MenuRepositoryPort } from '@/modules/ponto-de-venda/domain/repositories/menu-repository.port';
import { uuidv7 } from 'uuidv7';
import { randomInt } from 'crypto';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const STATUSES = ['NEGOTIATION', 'PAID', 'USED', 'RECURRING', 'CANCELLED', 'EXPIRED'];
const DISCOUNT_TYPES = ['fixed', 'percent'];
const STATUS_LABELS: Record<string, string> = {
  NEGOTIATION: 'Negociação', PAID: 'Pago', USED: 'Usado', RECURRING: 'Recorrente', CANCELLED: 'Cancelado', EXPIRED: 'Vencido',
};

type VoucherInput = {
  customerName?: string; customerCpf?: string; customerBirthDate?: string;
  customerAddress?: string; customerPhone?: string; customerEmail?: string;
  discountType?: string; amount: number;
  menuItemIds?: string[]; minOrderValue?: number; validDaysOfWeek?: number[];
  dueDate?: string; status?: string; code?: string;
};

function generateCode(): string {
  let code = '';
  for (let i = 0; i < 8; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

function sanitizeCustomCode(raw: string): string {
  return raw.trim().toUpperCase().slice(0, 20);
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
    @Inject(MENU_REPOSITORY_PORT) private readonly menuRepo: MenuRepositoryPort,
  ) {}

  async list() {
    return this.repo.findAll();
  }

  private toPublicVoucher(voucher: any) {
    return {
      id: voucher.id, code: voucher.code, status: voucher.status, dueDate: voucher.dueDate,
      discountType: voucher.discountType, amount: voucher.amount,
      menuItemIds: voucher.menuItemIds, minOrderValue: voucher.minOrderValue, validDaysOfWeek: voucher.validDaysOfWeek,
    };
  }

  async findByCode(rawCode: string) {
    const code = rawCode.trim().toUpperCase();
    const voucher = await this.repo.findByCode(code);
    if (!voucher) throw new NotFoundException('Voucher não encontrado');
    return this.toPublicVoucher(voucher);
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
    return this.toPublicVoucher(voucher);
  }

  private validate(dto: Partial<VoucherInput>, { partial }: { partial: boolean }) {
    const isRecurring = dto.status === 'RECURRING';

    // Dados de faturamento — obrigatórios só para vouchers que não são RECURRING
    if (!isRecurring) {
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
    }

    const discountType = dto.discountType ?? 'fixed';
    if (dto.discountType !== undefined && !DISCOUNT_TYPES.includes(dto.discountType)) {
      throw new BadRequestException('Tipo de desconto inválido');
    }
    if (!partial || dto.amount !== undefined) {
      if (!dto.amount || dto.amount <= 0) throw new BadRequestException('Valor do voucher inválido');
      if (discountType === 'percent' && dto.amount > 100) throw new BadRequestException('Percentual não pode passar de 100');
    }
    if (dto.minOrderValue !== undefined && dto.minOrderValue !== null && dto.minOrderValue < 0) {
      throw new BadRequestException('Valor mínimo do pedido inválido');
    }
    if (dto.validDaysOfWeek !== undefined && dto.validDaysOfWeek.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) {
      throw new BadRequestException('Dia da semana inválido');
    }

    // RECURRING: vencimento é opcional — sem prazo se não informado. Demais status: obrigatório.
    if (!isRecurring && (!partial || dto.dueDate !== undefined)) {
      if (!dto.dueDate || isNaN(Date.parse(dto.dueDate))) throw new BadRequestException('Data de vencimento inválida');
    } else if (dto.dueDate && isNaN(Date.parse(dto.dueDate))) {
      throw new BadRequestException('Data de vencimento inválida');
    }
    if (dto.status !== undefined && !STATUSES.includes(dto.status))
      throw new BadRequestException('Status inválido');
  }

  private async validateMenuItemIds(ids?: string[]) {
    if (!ids || ids.length === 0) return;
    const items = await Promise.all(ids.map((id) => this.menuRepo.findItemById(id).catch(() => null)));
    const missing = ids.filter((id, idx) => !items[idx]);
    if (missing.length) throw new BadRequestException(`Item(ns) do cardápio não encontrado(s): ${missing.join(', ')}`);
  }

  async create(dto: VoucherInput) {
    this.validate(dto, { partial: false });
    await this.validateMenuItemIds(dto.menuItemIds);
    const isRecurring = dto.status === 'RECURRING';
    const base = {
      id: uuidv7(),
      customerName:      dto.customerName?.trim() || null,
      customerCpf:       dto.customerCpf ? dto.customerCpf.replace(/\D/g, '') : null,
      customerBirthDate: dto.customerBirthDate ? new Date(dto.customerBirthDate) : null,
      customerAddress:   dto.customerAddress?.trim() || null,
      customerPhone:     dto.customerPhone ? dto.customerPhone.replace(/\D/g, '') : null,
      customerEmail:     dto.customerEmail?.trim() || null,
      discountType: dto.discountType ?? 'fixed',
      amount:  dto.amount,
      menuItemIds:     dto.menuItemIds ?? [],
      minOrderValue:   dto.minOrderValue ?? null,
      validDaysOfWeek: dto.validDaysOfWeek ?? [],
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      status:  (dto.status ?? 'NEGOTIATION'),
    };

    // RECURRING com código customizado: tentativa única — colisão vira erro claro, não retry
    if (isRecurring && dto.code?.trim()) {
      const code = sanitizeCustomCode(dto.code);
      if (!code) throw new BadRequestException('Código inválido');
      try {
        return await this.repo.create({ ...base, code, password: null });
      } catch (e: any) {
        if (e.code === 'P2002') throw new BadRequestException('Este código já está em uso por outro voucher');
        throw e;
      }
    }

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        return await this.repo.create({
          ...base,
          code: generateCode(),
          password: isRecurring ? null : generatePassword(),
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
    this.validate({ ...dto, status: dto.status ?? existing.status }, { partial: true });
    await this.validateMenuItemIds(dto.menuItemIds);
    return this.repo.update(id, {
      ...(dto.customerName !== undefined      && { customerName: dto.customerName?.trim() || null }),
      ...(dto.customerCpf !== undefined        && { customerCpf: dto.customerCpf ? dto.customerCpf.replace(/\D/g, '') : null }),
      ...(dto.customerBirthDate !== undefined  && { customerBirthDate: dto.customerBirthDate ? new Date(dto.customerBirthDate) : null }),
      ...(dto.customerAddress !== undefined    && { customerAddress: dto.customerAddress?.trim() || null }),
      ...(dto.customerPhone !== undefined      && { customerPhone: dto.customerPhone ? dto.customerPhone.replace(/\D/g, '') : null }),
      ...(dto.customerEmail !== undefined      && { customerEmail: dto.customerEmail?.trim() || null }),
      ...(dto.discountType !== undefined       && { discountType: dto.discountType }),
      ...(dto.amount !== undefined             && { amount: dto.amount }),
      ...(dto.menuItemIds !== undefined        && { menuItemIds: dto.menuItemIds }),
      ...(dto.minOrderValue !== undefined      && { minOrderValue: dto.minOrderValue }),
      ...(dto.validDaysOfWeek !== undefined    && { validDaysOfWeek: dto.validDaysOfWeek }),
      ...(dto.dueDate !== undefined            && { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }),
      ...(dto.status !== undefined             && { status: dto.status }),
    });
  }

  /** Aplica um voucher RECURRING no fechamento de conta — sem senha, apenas checa validade. */
  async useRecurring(id: string) {
    const voucher = await this.repo.findById(id);
    if (!voucher) throw new NotFoundException('Voucher não encontrado');
    if (voucher.status !== 'RECURRING') throw new BadRequestException('Este voucher não é do tipo recorrente');
    if (voucher.dueDate && new Date(voucher.dueDate) < new Date()) {
      throw new BadRequestException('Voucher recorrente vencido');
    }
    return this.toPublicVoucher(voucher);
  }

  async usageHistory() {
    return this.repo.findUsageHistory();
  }
}
