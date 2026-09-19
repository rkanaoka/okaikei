import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { FornecedorRepositoryPort } from '@/modules/controle-estoque/domain/repositories/fornecedor-repository.port';

@Injectable()
export class PrismaFornecedorRepository implements FornecedorRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  findAll(includeInactive = false) {
    return (this.prisma as any).fornecedor.findMany({
      where: includeInactive ? {} : { active: true },
      orderBy: { nome: 'asc' },
    });
  }

  findById(id: string) {
    return (this.prisma as any).fornecedor.findUnique({ where: { id } });
  }

  findByCnpj(cnpj: string) {
    return (this.prisma as any).fornecedor.findUnique({ where: { cnpj } });
  }

  create(data: { id: string; nome: string; cnpj?: string | null }) {
    return (this.prisma as any).fornecedor.create({ data });
  }

  update(id: string, data: Partial<{
    nome: string; cnpj: string | null; telefone: string | null; email: string | null; active: boolean;
  }>) {
    return (this.prisma as any).fornecedor.update({ where: { id }, data });
  }
}
