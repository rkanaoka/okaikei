export const NOTA_FISCAL_REPOSITORY_PORT = Symbol('NotaFiscalRepositoryPort');

export interface NotaFiscalRepositoryPort {
  /** Usado para impedir a importação duplicada da mesma NF-e (chave de acesso é única). */
  findByChave(chaveAcesso: string): Promise<any | null>;
  create(data: {
    id: string; chaveAcesso: string; numero?: string | null; serie?: string | null;
    fornecedorId?: string | null; dataEmissao?: Date | null; valorTotal?: number | null;
    status: string; xmlRaw?: string | null;
  }): Promise<any>;
}
