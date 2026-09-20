import { Inject, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import {
  INSUMO_REPOSITORY_PORT, InsumoRepositoryPort,
} from '@/modules/controle-estoque/domain/repositories/insumo-repository.port';
import {
  UnidadeBase, UnidadeMedida, resolverFatorConversao, unidadesParaBase,
} from '@/modules/controle-estoque/domain/value-objects/unidade-conversao';
import { gerarCodigoBarrasUnico } from '@/modules/controle-estoque/application/use-cases/insumo-codigo-barras.util';
import { uuidv7 } from 'uuidv7';

const UNIDADES_BASE_VALIDAS: UnidadeBase[] = ['MG', 'ML', 'UN'];

@Injectable()
export class InsumosService {
  constructor(
    @Inject(INSUMO_REPOSITORY_PORT) private readonly repo: InsumoRepositoryPort,
  ) {}

  list(includeInactive = false) {
    return this.repo.findAll(includeInactive);
  }

  async findOne(id: string) {
    const item = await this.repo.findById(id);
    if (!item) throw new NotFoundException('Insumo não encontrado.');
    return item;
  }

  unidadesDisponiveis(unidadeBase: UnidadeBase) {
    return unidadesParaBase(unidadeBase);
  }

  async create(dto: {
    name: string; categoria?: string; categoriaId?: string | null; subcategoriaId?: string | null;
    unidadeBase: UnidadeBase; estoqueMinimo?: number | null;
  }) {
    if (!dto.name?.trim()) throw new BadRequestException('Nome do insumo é obrigatório.');
    if (!UNIDADES_BASE_VALIDAS.includes(dto.unidadeBase)) {
      throw new BadRequestException('Unidade-base inválida. Use MG (massa), ML (volume) ou UN (contagem).');
    }
    const codigoBarras = await gerarCodigoBarrasUnico(this.repo);
    return this.repo.create({
      id: uuidv7(),
      name: dto.name.trim(),
      categoria: dto.categoria?.trim() || null,
      categoriaId: dto.categoriaId || null,
      subcategoriaId: dto.subcategoriaId || null,
      codigoBarras,
      unidadeBase: dto.unidadeBase,
      estoqueMinimo: dto.estoqueMinimo ?? null,
    });
  }

  async update(id: string, dto: Partial<{
    name: string; categoria: string | null; categoriaId: string | null; subcategoriaId: string | null;
    estoqueMinimo: number | null; active: boolean;
  }>) {
    await this.findOne(id);
    if (dto.name !== undefined && !dto.name.trim()) throw new BadRequestException('Nome do insumo é obrigatório.');
    return this.repo.update(id, {
      ...(dto.name !== undefined           && { name: dto.name.trim() }),
      ...(dto.categoria !== undefined      && { categoria: dto.categoria?.trim() || null }),
      ...(dto.categoriaId !== undefined    && { categoriaId: dto.categoriaId || null }),
      ...(dto.subcategoriaId !== undefined && { subcategoriaId: dto.subcategoriaId || null }),
      ...(dto.estoqueMinimo !== undefined  && { estoqueMinimo: dto.estoqueMinimo }),
      ...(dto.active !== undefined         && { active: dto.active }),
    });
  }

  remove(id: string) {
    return this.update(id, { active: false });
  }

  // ── Itens de fornecedor (marca/embalagem de compra do insumo) ───────────────

  async addFornecedorItem(insumoId: string, dto: {
    fornecedorId?: string | null; marca?: string | null; codigoFornecedor?: string | null;
    unidadeCompra: UnidadeMedida; fatorConversao?: number | null; ultimoPrecoUnitario?: number | null;
  }) {
    const insumo = await this.findOne(insumoId);
    if (!dto.unidadeCompra) throw new BadRequestException('Informe a unidade de compra.');
    let fator: number;
    try {
      fator = resolverFatorConversao(dto.unidadeCompra, insumo.unidadeBase, dto.fatorConversao);
    } catch (e: any) {
      throw new BadRequestException(e.message);
    }
    return this.repo.addFornecedorItem({
      id: uuidv7(),
      insumoId,
      fornecedorId: dto.fornecedorId || null,
      marca: dto.marca?.trim() || null,
      codigoFornecedor: dto.codigoFornecedor?.trim() || null,
      unidadeCompra: dto.unidadeCompra,
      fatorConversao: fator,
      ultimoPrecoUnitario: dto.ultimoPrecoUnitario ?? null,
    });
  }

  async updateFornecedorItem(id: string, dto: Partial<{
    fornecedorId: string | null; marca: string | null; codigoFornecedor: string | null;
    unidadeCompra: UnidadeMedida; fatorConversao: number | null; ultimoPrecoUnitario: number | null; active: boolean;
  }>) {
    const item = await this.repo.findFornecedorItemById(id);
    if (!item) throw new NotFoundException('Item de fornecedor não encontrado.');

    let fator: number | undefined;
    if (dto.unidadeCompra !== undefined || dto.fatorConversao !== undefined) {
      const insumo = await this.findOne(item.insumoId);
      const unidade = dto.unidadeCompra ?? item.unidadeCompra;
      try {
        fator = resolverFatorConversao(unidade, insumo.unidadeBase, dto.fatorConversao ?? Number(item.fatorConversao));
      } catch (e: any) {
        throw new BadRequestException(e.message);
      }
    }

    return this.repo.updateFornecedorItem(id, {
      ...(dto.fornecedorId !== undefined     && { fornecedorId: dto.fornecedorId || null }),
      ...(dto.marca !== undefined            && { marca: dto.marca?.trim() || null }),
      ...(dto.codigoFornecedor !== undefined && { codigoFornecedor: dto.codigoFornecedor?.trim() || null }),
      ...(dto.unidadeCompra !== undefined    && { unidadeCompra: dto.unidadeCompra }),
      ...(fator !== undefined                && { fatorConversao: fator }),
      ...(dto.ultimoPrecoUnitario !== undefined && { ultimoPrecoUnitario: dto.ultimoPrecoUnitario }),
      ...(dto.active !== undefined           && { active: dto.active }),
    });
  }

  removeFornecedorItem(id: string) {
    return this.updateFornecedorItem(id, { active: false });
  }

  // ── Entrada manual de estoque ────────────────────────────────────────────────

  async registrarEntradaManual(insumoId: string, dto: {
    fornecedorItemId?: string; quantidadeCompra: number; unidadeCompra?: UnidadeMedida;
    precoUnitario?: number; observacao?: string;
  }) {
    const insumo = await this.findOne(insumoId);
    const quantidade = Number(dto.quantidadeCompra);
    if (!quantidade || quantidade <= 0) throw new BadRequestException('Informe uma quantidade maior que zero.');

    let fator: number;
    let fornecedorItemId: string | null = null;

    if (dto.fornecedorItemId) {
      const item = await this.repo.findFornecedorItemById(dto.fornecedorItemId);
      if (!item || item.insumoId !== insumoId) throw new BadRequestException('Item de fornecedor inválido para este insumo.');
      fator = Number(item.fatorConversao);
      fornecedorItemId = item.id;
    } else if (dto.unidadeCompra) {
      try {
        fator = resolverFatorConversao(dto.unidadeCompra, insumo.unidadeBase, undefined);
      } catch (e: any) {
        throw new BadRequestException(e.message);
      }
    } else {
      throw new BadRequestException('Informe o item de fornecedor cadastrado ou uma unidade de medida padrão (mg/g/kg/ml/L/un).');
    }

    const quantidadeBase = quantidade * fator;

    await this.repo.registrarMovimentacao({
      id: uuidv7(),
      insumoId,
      fornecedorItemId,
      tipo: 'ENTRADA',
      origem: 'MANUAL',
      quantidade: quantidadeBase,
      precoUnitario: dto.precoUnitario ?? null,
      observacao: dto.observacao?.trim() || null,
    });

    return this.repo.ajustarEstoque(insumoId, quantidadeBase);
  }
}
