export const GARCOM_REPOSITORY_PORT = Symbol('GarcomRepositoryPort');

export interface GarcomRepositoryPort {
  findAll(): Promise<any[]>;
  findById(id: string): Promise<any | null>;
  findByCode(code: string): Promise<any | null>;
  create(data: { id: string; code: string; name: string; userId?: string | null }): Promise<any>;
  update(id: string, data: Partial<{ name: string; userId: string | null; active: boolean }>): Promise<any>;
}
