export const VOUCHER_REPOSITORY_PORT = Symbol('VoucherRepositoryPort');

export interface VoucherRepositoryPort {
  findAll(filter?: { status?: string; search?: string }): Promise<any[]>;
  findById(id: string): Promise<any | null>;
  findByCode(code: string): Promise<any | null>;
  create(data: {
    id: string; code: string; password?: string | null;
    customerName: string | null; customerCpf: string | null; customerBirthDate: Date | null;
    customerAddress: string | null; customerPhone: string | null; customerEmail: string | null;
    discountType: string; amount: number;
    menuItemIds: string[]; minOrderValue: number | null; validDaysOfWeek: number[];
    dueDate: Date | null; status: string;
  }): Promise<any>;
  update(id: string, data: Partial<{
    customerName: string | null; customerCpf: string | null; customerBirthDate: Date | null;
    customerAddress: string | null; customerPhone: string | null; customerEmail: string | null;
    discountType: string; amount: number;
    menuItemIds: string[]; minOrderValue: number | null; validDaysOfWeek: number[];
    dueDate: Date | null; status: string;
  }>): Promise<any>;
  updateStatus(id: string, status: string): Promise<any>;
  findUsageHistory(): Promise<any[]>;
}
