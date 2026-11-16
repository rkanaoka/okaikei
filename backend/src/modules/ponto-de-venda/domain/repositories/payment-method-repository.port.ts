export const PAYMENT_METHOD_REPOSITORY_PORT = Symbol('PaymentMethodRepositoryPort');

export interface PaymentMethodData {
  label:        string;
  description?: string | null;
  color:        string;
  active:       boolean;
  sortOrder:    number;
}

export interface PaymentMethodRepositoryPort {
  findAll(filter?: { active?: boolean }): Promise<any[]>;
  findById(id: string): Promise<any | null>;
  findByCode(code: string): Promise<any | null>;
  findByCodes(codes: string[]): Promise<any[]>;
  findUsageCounts(): Promise<Array<{ method: string; count: number }>>;
  create(data: PaymentMethodData & { id: string; code: string }): Promise<any>;
  update(id: string, data: Partial<PaymentMethodData>): Promise<any>;
}
