export const INSUMO_REPOSITORY_PORT = Symbol('InsumoRepositoryPort');

export interface InsumoRepositoryPort {
  findAll(includeInactive?: boolean): Promise<any[]>;
  findById(id: string): Promise<any | null>;
  create(data: {
    id: string; name: string; categoria?: string | null; categoriaId?: string | null; subcategoriaId?: string | null;
    unidadeBase: string; estoqueMinimo?: number | null;
  }): Promise<any>;
  update(id: string, data: Partial<{
    name: string; categoria: string | null; categoriaId: string | null; subcategoriaId: string | null;
    estoqueMinimo: number | null; active: boolean;
  }>): Promise<any>;

  // ── Itens de fornecedor (marca/embalagem de compra de um insumo) ────────────
  addFornecedorItem(data: {
    id: string; insumoId: string; fornecedorId?: string | null; marca?: string | null;
    codigoFornecedor?: string | null; unidadeCompra: string; fatorConversao: number;
    ultimoPrecoUnitario?: number | null;
  }): Promise<any>;
  updateFornecedorItem(id: string, data: Partial<{
    fornecedorId: string | null; marca: string | null; codigoFornecedor: string | null;
    unidadeCompra: string; fatorConversao: number; ultimoPrecoUnitario: number | null; active: boolean;
  }>): Promise<any>;
  findFornecedorItemById(id: string): Promise<any | null>;
  /** Usado pela importação de NF-e para reconhecer um item já cadastrado deste fornecedor (match por cProd). */
  findFornecedorItemByCodigo(fornecedorId: string, codigoFornecedor: string): Promise<any | null>;

  // ── Movimentação e saldo de estoque ──────────────────────────────────────────
  registrarMovimentacao(data: {
    id: string; insumoId: string; fornecedorItemId?: string | null; tipo: string; origem: string;
    quantidade: number; precoUnitario?: number | null; notaFiscalId?: string | null; observacao?: string | null;
  }): Promise<any>;
  /** Soma `delta` (pode ser negativo) ao estoqueAtual do insumo, na sua unidade-base. */
  ajustarEstoque(insumoId: string, delta: number): Promise<any>;
}
