import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { NotaFiscalRepositoryPort } from '@/modules/controle-estoque/domain/repositories/nota-fiscal-repository.port';

@Injectable()
export class PrismaNotaFiscalRepository implements NotaFiscalRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  findByChave(chaveAcesso: string) {
    return (this.prisma as any).notaFiscalImportada.findUnique({ where: { chaveAcesso } });
  }

  create(data: {
    id: string; chaveAcesso: string; numero?: string | null; serie?: string | null;
    fornecedorId?: string | null; dataEmissao?: Date | null; valorTotal?: number | null;
    status: string; xmlRaw?: string | null;
  }) {
    return (this.prisma as any).notaFiscalImportada.create({ data });
  }
}
