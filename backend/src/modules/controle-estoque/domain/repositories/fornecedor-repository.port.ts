export const FORNECEDOR_REPOSITORY_PORT = Symbol('FornecedorRepositoryPort');

export interface FornecedorRepositoryPort {
  findAll(includeInactive?: boolean): Promise<any[]>;
  findById(id: string): Promise<any | null>;
  findByCnpj(cnpj: string): Promise<any | null>;
  create(data: { id: string; nome: string; cnpj?: string | null }): Promise<any>;
  update(id: string, data: Partial<{
    nome: string; cnpj: string | null; telefone: string | null; email: string | null; active: boolean;
  }>): Promise<any>;
}
