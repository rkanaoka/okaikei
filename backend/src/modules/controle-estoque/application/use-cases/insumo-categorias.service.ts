import { Inject, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import {
  INSUMO_CATEGORIA_REPOSITORY_PORT, InsumoCategoriaRepositoryPort,
} from '@/modules/controle-estoque/domain/repositories/insumo-categoria-repository.port';
import { uuidv7 } from 'uuidv7';

@Injectable()
export class InsumoCategoriasService {
  constructor(
    @Inject(INSUMO_CATEGORIA_REPOSITORY_PORT) private readonly repo: InsumoCategoriaRepositoryPort,
  ) {}

  list(includeInactive = false) {
    return this.repo.findAll(includeInactive);
  }

  async create(dto: { nome: string }) {
    if (!dto.nome?.trim()) throw new BadRequestException('Nome da categoria é obrigatório.');
    const existing = await this.repo.findByNome(dto.nome.trim());
    if (existing) throw new BadRequestException('Já existe uma categoria com esse nome.');
    return this.repo.create({ id: uuidv7(), nome: dto.nome.trim() });
  }

  async update(id: string, dto: Partial<{ nome: string; sortOrder: number; active: boolean }>) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('Categoria não encontrada.');
    if (dto.nome !== undefined && !dto.nome.trim()) throw new BadRequestException('Nome da categoria é obrigatório.');
    return this.repo.update(id, {
      ...(dto.nome !== undefined      && { nome: dto.nome.trim() }),
      ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      ...(dto.active !== undefined    && { active: dto.active }),
    });
  }

  async createSubcategoria(categoriaId: string, dto: { nome: string }) {
    const categoria = await this.repo.findById(categoriaId);
    if (!categoria) throw new NotFoundException('Categoria não encontrada.');
    if (!dto.nome?.trim()) throw new BadRequestException('Nome da subcategoria é obrigatório.');
    const existing = await this.repo.findSubcategoriaByNome(categoriaId, dto.nome.trim());
    if (existing) throw new BadRequestException('Já existe uma subcategoria com esse nome nesta categoria.');
    return this.repo.createSubcategoria({ id: uuidv7(), categoriaId, nome: dto.nome.trim() });
  }

  async updateSubcategoria(id: string, dto: Partial<{ nome: string; sortOrder: number; active: boolean }>) {
    const existing = await this.repo.findSubcategoriaById(id);
    if (!existing) throw new NotFoundException('Subcategoria não encontrada.');
    if (dto.nome !== undefined && !dto.nome.trim()) throw new BadRequestException('Nome da subcategoria é obrigatório.');
    return this.repo.updateSubcategoria(id, {
      ...(dto.nome !== undefined      && { nome: dto.nome.trim() }),
      ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      ...(dto.active !== undefined    && { active: dto.active }),
    });
  }
}
