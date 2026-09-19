import { Inject, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import {
  FORNECEDOR_REPOSITORY_PORT, FornecedorRepositoryPort,
} from '@/modules/controle-estoque/domain/repositories/fornecedor-repository.port';
import { uuidv7 } from 'uuidv7';

@Injectable()
export class FornecedoresService {
  constructor(
    @Inject(FORNECEDOR_REPOSITORY_PORT) private readonly repo: FornecedorRepositoryPort,
  ) {}

  list(includeInactive = false) {
    return this.repo.findAll(includeInactive);
  }

  async create(dto: { nome: string; cnpj?: string | null; telefone?: string | null; email?: string | null }) {
    if (!dto.nome?.trim()) throw new BadRequestException('Nome do fornecedor é obrigatório.');
    const cnpj = dto.cnpj?.replace(/\D/g, '') || null;
    if (cnpj) {
      const existing = await this.repo.findByCnpj(cnpj);
      if (existing) throw new BadRequestException('Já existe um fornecedor cadastrado com esse CNPJ.');
    }
    return this.repo.create({
      id: uuidv7(), nome: dto.nome.trim(), cnpj,
    });
  }

  async update(id: string, dto: Partial<{ nome: string; cnpj: string | null; telefone: string | null; email: string | null; active: boolean }>) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('Fornecedor não encontrado.');
    if (dto.nome !== undefined && !dto.nome.trim()) throw new BadRequestException('Nome do fornecedor é obrigatório.');
    return this.repo.update(id, {
      ...(dto.nome !== undefined     && { nome: dto.nome.trim() }),
      ...(dto.cnpj !== undefined     && { cnpj: dto.cnpj ? dto.cnpj.replace(/\D/g, '') : null }),
      ...(dto.telefone !== undefined && { telefone: dto.telefone || null }),
      ...(dto.email !== undefined    && { email: dto.email || null }),
      ...(dto.active !== undefined   && { active: dto.active }),
    });
  }
}
