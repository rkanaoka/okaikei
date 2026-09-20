import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EtiquetaLayoutRepositoryPort } from '@/modules/controle-estoque/domain/repositories/etiqueta-layout-repository.port';

// Persiste na tabela genérica system_config (chave/valor Json) — evita migration
// dedicada por tipo de etiqueta (validade, código de barras, ...).
@Injectable()
export class PrismaEtiquetaLayoutRepository implements EtiquetaLayoutRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async find(key: string): Promise<Record<string, any> | null> {
    const row = await this.prisma.systemConfig.findUnique({ where: { key } });
    return (row?.value as Record<string, any>) ?? null;
  }

  async save(key: string, config: Record<string, any>): Promise<void> {
    await this.prisma.systemConfig.upsert({
      where:  { key },
      update: { value: config },
      create: { key, value: config },
    });
  }
}
