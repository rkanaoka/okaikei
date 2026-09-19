import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { InsumoRepositoryPort } from '@/modules/controle-estoque/domain/repositories/insumo-repository.port';

const FORNECEDOR_ITEM_INCLUDE = {
  fornecedor: { select: { id: true, nome: true, cnpj: true } },
};

const INSUMO_INCLUDE = {
  itensFornecedor: {
    where: { active: true },
    include: FORNECEDOR_ITEM_INCLUDE,
    orderBy: { createdAt: 'asc' as const },
  },
};

@Injectable()
export class PrismaInsumoRepository implements InsumoRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  findAll(includeInactive = false) {
    return (this.prisma as any).insumoItem.findMany({
      where: includeInactive ? {} : { active: true },
      include: INSUMO_INCLUDE,
      orderBy: { name: 'asc' },
    });
  }

  findById(id: string) {
    return (this.prisma as any).insumoItem.findUnique({ where: { id }, include: INSUMO_INCLUDE });
  }

  create(data: { id: string; name: string; categoria?: string | null; unidadeBase: string; estoqueMinimo?: number | null }) {
    return (this.prisma as any).insumoItem.create({ data, include: INSUMO_INCLUDE });
  }

  update(id: string, data: Partial<{ name: string; categoria: string | null; estoqueMinimo: number | null; active: boolean }>) {
    return (this.prisma as any).insumoItem.update({ where: { id }, data, include: INSUMO_INCLUDE });
  }

  addFornecedorItem(data: {
    id: string; insumoId: string; fornecedorId?: string | null; marca?: string | null;
    codigoFornecedor?: string | null; unidadeCompra: string; fatorConversao: number;
    ultimoPrecoUnitario?: number | null;
  }) {
    return (this.prisma as any).insumoFornecedorItem.create({ data, include: FORNECEDOR_ITEM_INCLUDE });
  }

  updateFornecedorItem(id: string, data: Partial<{
    fornecedorId: string | null; marca: string | null; codigoFornecedor: string | null;
    unidadeCompra: string; fatorConversao: number; ultimoPrecoUnitario: number | null; active: boolean;
  }>) {
    return (this.prisma as any).insumoFornecedorItem.update({ where: { id }, data, include: FORNECEDOR_ITEM_INCLUDE });
  }

  findFornecedorItemById(id: string) {
    return (this.prisma as any).insumoFornecedorItem.findUnique({
      where: { id },
      include: { ...FORNECEDOR_ITEM_INCLUDE, insumo: true },
    });
  }

  findFornecedorItemByCodigo(fornecedorId: string, codigoFornecedor: string) {
    if (!fornecedorId || !codigoFornecedor) return Promise.resolve(null);
    return (this.prisma as any).insumoFornecedorItem.findFirst({
      where: { fornecedorId, codigoFornecedor, active: true },
      include: { ...FORNECEDOR_ITEM_INCLUDE, insumo: true },
    });
  }

  registrarMovimentacao(data: {
    id: string; insumoId: string; fornecedorItemId?: string | null; tipo: string; origem: string;
    quantidade: number; precoUnitario?: number | null; notaFiscalId?: string | null; observacao?: string | null;
  }) {
    return (this.prisma as any).movimentacaoEstoque.create({ data });
  }

  ajustarEstoque(insumoId: string, delta: number) {
    return (this.prisma as any).insumoItem.update({
      where: { id: insumoId },
      data: { estoqueAtual: { increment: delta } },
      include: INSUMO_INCLUDE,
    });
  }
}
