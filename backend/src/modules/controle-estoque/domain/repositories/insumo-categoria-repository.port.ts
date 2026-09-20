export const INSUMO_CATEGORIA_REPOSITORY_PORT = Symbol('InsumoCategoriaRepositoryPort');

export interface InsumoCategoriaRepositoryPort {
  findAll(includeInactive?: boolean): Promise<any[]>;
  findById(id: string): Promise<any | null>;
  findByNome(nome: string): Promise<any | null>;
  create(data: { id: string; nome: string }): Promise<any>;
  update(id: string, data: Partial<{ nome: string; sortOrder: number; active: boolean }>): Promise<any>;

  findSubcategoriaById(id: string): Promise<any | null>;
  findSubcategoriaByNome(categoriaId: string, nome: string): Promise<any | null>;
  createSubcategoria(data: { id: string; categoriaId: string; nome: string }): Promise<any>;
  updateSubcategoria(id: string, data: Partial<{ nome: string; sortOrder: number; active: boolean }>): Promise<any>;
}
