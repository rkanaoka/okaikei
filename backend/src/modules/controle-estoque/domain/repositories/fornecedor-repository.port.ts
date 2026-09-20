export const FORNECEDOR_REPOSITORY_PORT = Symbol('FornecedorRepositoryPort');

export interface FornecedorDadosOpcionais {
  nomeFantasia?: string | null;
  ie?: string | null;
  telefone?: string | null;
  email?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  municipio?: string | null;
  uf?: string | null;
  cep?: string | null;
  representanteNome?: string | null;
  representanteTelefone?: string | null;
  representanteEmail?: string | null;
}

export interface FornecedorRepositoryPort {
  findAll(includeInactive?: boolean): Promise<any[]>;
  findById(id: string): Promise<any | null>;
  findByCnpj(cnpj: string): Promise<any | null>;
  create(data: { id: string; nome: string; cnpj?: string | null } & FornecedorDadosOpcionais): Promise<any>;
  update(id: string, data: Partial<{ nome: string; cnpj: string | null; active: boolean } & FornecedorDadosOpcionais>): Promise<any>;
}
