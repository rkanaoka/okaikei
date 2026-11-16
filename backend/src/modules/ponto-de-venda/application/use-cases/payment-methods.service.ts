import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  PAYMENT_METHOD_REPOSITORY_PORT,
  PaymentMethodData,
  PaymentMethodRepositoryPort,
} from '@/modules/ponto-de-venda/domain/repositories/payment-method-repository.port';
import { uuidv7 } from 'uuidv7';

/** Forma cujo saldo compõe a gaveta física no fechamento do caixa — não pode ser desativada. */
export const CASH_METHOD_CODE = 'CASH';

export type PaymentMethodInput = Partial<PaymentMethodData>;

/** "Vale Alimentação" → "VALE_ALIMENTACAO" */
function codeFromLabel(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 30);
}

@Injectable()
export class PaymentMethodsService {
  constructor(
    @Inject(PAYMENT_METHOD_REPOSITORY_PORT) private readonly repo: PaymentMethodRepositoryPort,
  ) {}

  async list(dto: { active?: boolean } = {}) {
    const [methods, counts] = await Promise.all([
      this.repo.findAll(dto.active !== undefined ? { active: dto.active } : undefined),
      this.repo.findUsageCounts(),
    ]);
    const countMap = new Map(counts.map((c) => [c.method, c.count]));
    return methods.map((m) => ({ ...m, usageCount: countMap.get(m.code) ?? 0 }));
  }

  async create(dto: PaymentMethodInput) {
    const data = this.validate(dto, true) as PaymentMethodData;
    const baseCode = codeFromLabel(data.label);
    if (!baseCode) throw new BadRequestException('Nome da forma de pagamento inválido');

    // O código é derivado do nome; se já existir (PIX), gera PIX_2, PIX_3…
    let code = baseCode;
    for (let n = 2; await this.repo.findByCode(code); n++) {
      code = `${baseCode.slice(0, 30 - String(n).length - 1)}_${n}`;
    }

    if (data.sortOrder === undefined) {
      const all = await this.repo.findAll();
      data.sortOrder = all.reduce((max, m) => Math.max(max, m.sortOrder), 0) + 1;
    }
    return this.repo.create({ ...data, id: uuidv7(), code });
  }

  async update(id: string, dto: PaymentMethodInput) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('Forma de pagamento não encontrada');
    const data = this.validate(dto, false);
    if (existing.code === CASH_METHOD_CODE && data.active === false) {
      throw new BadRequestException('Dinheiro não pode ser desativado — ele é usado no fechamento do caixa');
    }
    return this.repo.update(id, data);
  }

  /** Garante que todos os códigos informados existem e estão ativos (usado no fechamento da comanda). */
  async assertUsable(codes: string[]) {
    const unique = [...new Set(codes)];
    const found  = await this.repo.findByCodes(unique);
    for (const code of unique) {
      const method = found.find((m) => m.code === code);
      if (!method)        throw new BadRequestException(`Forma de pagamento inválida: ${code}`);
      if (!method.active) throw new BadRequestException(`Forma de pagamento desativada: ${method.label}`);
    }
  }

  /** Mapa código → rótulo, incluindo formas desativadas (histórico/impressão). */
  async labelMap(): Promise<Record<string, string>> {
    const methods = await this.repo.findAll();
    return Object.fromEntries(methods.map((m) => [m.code, m.label]));
  }

  /** Códigos em ordem de exibição (inclui desativadas, para o resumo do caixa). */
  async orderedCodes(): Promise<string[]> {
    const methods = await this.repo.findAll();
    return methods.map((m) => m.code);
  }

  private validate(dto: PaymentMethodInput, isCreate: boolean): Partial<PaymentMethodData> {
    const data: Partial<PaymentMethodData> = {};
    if (isCreate || dto.label !== undefined) {
      const label = dto.label?.trim();
      if (!label) throw new BadRequestException('Nome da forma de pagamento é obrigatório');
      if (label.length > 60) throw new BadRequestException('Nome deve ter no máximo 60 caracteres');
      data.label = label;
    }
    if (dto.description !== undefined) {
      const description = dto.description?.trim() || null;
      if (description && description.length > 200) throw new BadRequestException('Descrição deve ter no máximo 200 caracteres');
      data.description = description;
    }
    if (isCreate || dto.color !== undefined) {
      const color = dto.color ?? '#999999';
      if (!/^#[0-9a-fA-F]{6}$/.test(color)) throw new BadRequestException('Cor inválida (use o formato #RRGGBB)');
      data.color = color;
    }
    if (dto.active !== undefined) data.active = Boolean(dto.active);
    else if (isCreate) data.active = true;
    if (dto.sortOrder !== undefined && dto.sortOrder !== null) {
      const sortOrder = Number(dto.sortOrder);
      if (!Number.isInteger(sortOrder) || sortOrder < 0) throw new BadRequestException('Ordem inválida');
      data.sortOrder = sortOrder;
    }
    return data;
  }
}
