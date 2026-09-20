import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { InsumoCategoriaRepositoryPort } from '@/modules/controle-estoque/domain/repositories/insumo-categoria-repository.port';

@Injectable()
export class PrismaInsumoCategoriaRepository implements InsumoCategoriaRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  findAll(includeInactive = false) {
    return (this.prisma as any).insumoCategoria.findMany({
      where: includeInactive ? {} : { active: true },
      include: {
        subcategorias: {
          where: includeInactive ? {} : { active: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  findById(id: string) {
    return (this.prisma as any).insumoCategoria.findUnique({
      where: { id },
      include: { subcategorias: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  findByNome(nome: string) {
    return (this.prisma as any).insumoCategoria.findUnique({ where: { nome } });
  }

  create(data: { id: string; nome: string }) {
    return (this.prisma as any).insumoCategoria.create({ data });
  }

  update(id: string, data: Partial<{ nome: string; sortOrder: number; active: boolean }>) {
    return (this.prisma as any).insumoCategoria.update({ where: { id }, data });
  }

  findSubcategoriaById(id: string) {
    return (this.prisma as any).insumoSubcategoria.findUnique({ where: { id } });
  }

  findSubcategoriaByNome(categoriaId: string, nome: string) {
    return (this.prisma as any).insumoSubcategoria.findFirst({ where: { categoriaId, nome } });
  }

  createSubcategoria(data: { id: string; categoriaId: string; nome: string }) {
    return (this.prisma as any).insumoSubcategoria.create({ data });
  }

  updateSubcategoria(id: string, data: Partial<{ nome: string; sortOrder: number; active: boolean }>) {
    return (this.prisma as any).insumoSubcategoria.update({ where: { id }, data });
  }
}
