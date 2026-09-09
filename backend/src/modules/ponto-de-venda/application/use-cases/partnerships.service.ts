import { Inject, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PARTNERSHIP_REPOSITORY_PORT, PartnershipRepositoryPort, PartnershipCouponInput } from '@/modules/ponto-de-venda/domain/repositories/partnership-repository.port';
import { MENU_REPOSITORY_PORT, MenuRepositoryPort } from '@/modules/ponto-de-venda/domain/repositories/menu-repository.port';
import { uuidv7 } from 'uuidv7';

const COUPON_TYPES = ['TWO_FOR_ONE_ITEM', 'TWO_FOR_ONE_CATEGORY', 'ITEM_DISCOUNT', 'ORDER_DISCOUNT'];
const DISCOUNT_TYPES = ['fixed', 'percent'];

function sanitizeCode(raw: string): string {
  return raw.trim().toUpperCase().slice(0, 20);
}

export interface PartnershipInput {
  name: string;
  description?: string;
  responsible?: string;
  contact?: string;
  cnpj?: string;
  code: string;
  startDate?: string;
  endDate?: string;
  validDaysOfWeek?: number[];
  startTime?: string;
  endTime?: string;
  active?: boolean;
  coupons: PartnershipCouponInput[];
}

@Injectable()
export class PartnershipsService {
  constructor(
    @Inject(PARTNERSHIP_REPOSITORY_PORT) private readonly repo: PartnershipRepositoryPort,
    @Inject(MENU_REPOSITORY_PORT) private readonly menuRepo: MenuRepositoryPort,
  ) {}

  async list() {
    return this.repo.findAll();
  }

  async findOne(id: string) {
    const p = await this.repo.findById(id);
    if (!p) throw new NotFoundException('Parceria não encontrada');
    return p;
  }

  /** Usado no fechamento de comanda: busca por código, valida se pode ser usada agora. */
  async findUsableByCode(rawCode: string) {
    const code = sanitizeCode(rawCode);
    const p = await this.repo.findByCode(code);
    if (!p) throw new NotFoundException('Parceria não encontrada');
    this.assertUsableNow(p);
    return p;
  }

  private assertUsableNow(p: any) {
    if (!p.active) throw new BadRequestException('Esta parceria está inativa');
    const now = new Date();
    if (p.startDate && now < new Date(p.startDate)) throw new BadRequestException('Esta parceria ainda não iniciou');
    if (p.endDate) {
      const end = new Date(p.endDate);
      end.setHours(23, 59, 59, 999);
      if (now > end) throw new BadRequestException('Esta parceria está expirada');
    }
    if (p.validDaysOfWeek?.length > 0 && !p.validDaysOfWeek.includes(now.getDay())) {
      throw new BadRequestException('Esta parceria não é válida hoje');
    }
    if (p.startTime && p.endTime) {
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      if (hhmm < p.startTime || hhmm > p.endTime) {
        throw new BadRequestException(`Esta parceria só é válida das ${p.startTime} às ${p.endTime}`);
      }
    }
  }

  private validateCoupon(c: PartnershipCouponInput) {
    if (!COUPON_TYPES.includes(c.type)) throw new BadRequestException('Tipo de cupom inválido');
    if (c.type === 'TWO_FOR_ONE_ITEM' && !c.menuItemId) {
      throw new BadRequestException('Selecione o item do cardápio para o cupom "2 por 1 (item)"');
    }
    if (c.type === 'TWO_FOR_ONE_CATEGORY' && !c.categoryId) {
      throw new BadRequestException('Selecione a categoria do cardápio para o cupom "2 por 1 (categoria)"');
    }
    if (c.type === 'ITEM_DISCOUNT') {
      if (!c.menuItemId) throw new BadRequestException('Selecione o item do cardápio para o cupom "Desconto (item)"');
      this.validateDiscountFields(c);
    }
    if (c.type === 'ORDER_DISCOUNT') {
      this.validateDiscountFields(c);
      if (c.minOrderValue != null && c.minOrderValue < 0) throw new BadRequestException('Valor mínimo do pedido inválido');
    }
  }

  private validateDiscountFields(c: PartnershipCouponInput) {
    const discountType = c.discountType ?? 'fixed';
    if (!DISCOUNT_TYPES.includes(discountType)) throw new BadRequestException('Tipo de desconto inválido');
    if (!c.amount || c.amount <= 0) throw new BadRequestException('Valor do desconto do cupom inválido');
    if (discountType === 'percent' && c.amount > 100) throw new BadRequestException('Percentual do cupom não pode passar de 100');
  }

  private async validateReferences(coupons: PartnershipCouponInput[]) {
    for (const c of coupons) {
      if (c.menuItemId) {
        const item = await this.menuRepo.findItemById(c.menuItemId);
        if (!item) throw new BadRequestException(`Item do cardápio não encontrado para um dos cupons`);
      }
      if (c.categoryId) {
        const cat = await this.menuRepo.findCategoryById(c.categoryId);
        if (!cat) throw new BadRequestException(`Categoria do cardápio não encontrada para um dos cupons`);
      }
    }
  }

  private validate(dto: Partial<PartnershipInput>, { partial }: { partial: boolean }) {
    if (!partial || dto.name !== undefined) {
      if (!dto.name?.trim()) throw new BadRequestException('Nome da parceria é obrigatório');
    }
    if (!partial || dto.code !== undefined) {
      if (!dto.code?.trim()) throw new BadRequestException('Código da parceria é obrigatório');
    }
    if (dto.startDate && dto.endDate && new Date(dto.startDate) > new Date(dto.endDate)) {
      throw new BadRequestException('Data inicial não pode ser depois da data final');
    }
    if (dto.validDaysOfWeek?.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) {
      throw new BadRequestException('Dia da semana inválido');
    }
    if ((dto.startTime && !dto.endTime) || (!dto.startTime && dto.endTime)) {
      throw new BadRequestException('Informe início e fim do intervalo de horário, ou deixe os dois em branco');
    }
    if (dto.coupons !== undefined) {
      if (!dto.coupons.length) throw new BadRequestException('A parceria precisa de ao menos 1 cupom');
      for (const c of dto.coupons) this.validateCoupon(c);
    }
  }

  async create(dto: PartnershipInput) {
    this.validate(dto, { partial: false });
    await this.validateReferences(dto.coupons);
    try {
      return await this.repo.create({
        id: uuidv7(),
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        responsible: dto.responsible?.trim() || null,
        contact: dto.contact?.trim() || null,
        cnpj: dto.cnpj?.replace(/\D/g, '') || null,
        code: sanitizeCode(dto.code),
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        validDaysOfWeek: dto.validDaysOfWeek ?? [],
        startTime: dto.startTime || null,
        endTime: dto.endTime || null,
        coupons: dto.coupons,
      });
    } catch (e: any) {
      if (e.code === 'P2002') throw new BadRequestException('Este código já está em uso por outra parceria');
      throw e;
    }
  }

  async update(id: string, dto: Partial<PartnershipInput>) {
    await this.findOne(id);
    this.validate(dto, { partial: true });
    if (dto.coupons !== undefined) await this.validateReferences(dto.coupons);
    return this.repo.updateWithCoupons(id, {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
      ...(dto.responsible !== undefined ? { responsible: dto.responsible?.trim() || null } : {}),
      ...(dto.contact !== undefined ? { contact: dto.contact?.trim() || null } : {}),
      ...(dto.cnpj !== undefined ? { cnpj: dto.cnpj?.replace(/\D/g, '') || null } : {}),
      ...(dto.startDate !== undefined ? { startDate: dto.startDate ? new Date(dto.startDate) : null } : {}),
      ...(dto.endDate !== undefined ? { endDate: dto.endDate ? new Date(dto.endDate) : null } : {}),
      ...(dto.validDaysOfWeek !== undefined ? { validDaysOfWeek: dto.validDaysOfWeek } : {}),
      ...(dto.startTime !== undefined ? { startTime: dto.startTime || null } : {}),
      ...(dto.endTime !== undefined ? { endTime: dto.endTime || null } : {}),
      ...(dto.active !== undefined ? { active: dto.active } : {}),
      ...(dto.coupons !== undefined ? { coupons: dto.coupons } : {}),
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.repo.remove(id);
    return { id };
  }
}
