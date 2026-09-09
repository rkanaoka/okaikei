export const PARTNERSHIP_REPOSITORY_PORT = Symbol('PartnershipRepositoryPort');

export interface PartnershipCouponInput {
  id?: string;
  type: string;
  menuItemId?: string | null;
  categoryId?: string | null;
  discountType?: string | null;
  amount?: number | null;
  minOrderValue?: number | null;
  active?: boolean;
}

export interface PartnershipRepositoryPort {
  findAll(): Promise<any[]>;
  findById(id: string): Promise<any | null>;
  findByCode(code: string): Promise<any | null>;
  create(data: {
    id: string; name: string; description: string | null; responsible: string | null;
    contact: string | null; cnpj: string | null; code: string;
    startDate: Date | null; endDate: Date | null;
    validDaysOfWeek: number[]; startTime: string | null; endTime: string | null;
    coupons: PartnershipCouponInput[];
  }): Promise<any>;
  updateWithCoupons(id: string, data: Partial<{
    name: string; description: string | null; responsible: string | null;
    contact: string | null; cnpj: string | null;
    startDate: Date | null; endDate: Date | null;
    validDaysOfWeek: number[]; startTime: string | null; endTime: string | null;
    active: boolean;
    coupons: PartnershipCouponInput[];
  }>): Promise<any>;
  remove(id: string): Promise<any>;
}
