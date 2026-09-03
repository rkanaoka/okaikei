export const TABLE_REPOSITORY_PORT = Symbol('TableRepositoryPort');

export interface TableRepositoryPort {
  findAll(): Promise<any[]>;
  findById(id: string): Promise<any | null>;
  findByTypeAndNumber(type: string, number: number): Promise<any | null>;
  create(data: { id: string; type: string; number: number; label: string; capacity?: number }): Promise<any>;
  update(id: string, data: Partial<{ type: string; number: number; label: string; capacity: number; status: string }>): Promise<any>;
  remove(id: string): Promise<any>;
  setStatus(id: string, status: string): Promise<any>;
}
