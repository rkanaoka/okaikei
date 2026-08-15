import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EtiquetaLayoutRepositoryPort } from '@/modules/controle-estoque/domain/repositories/etiqueta-layout-repository.port';
import { ETIQUETA_LAYOUT_CONFIG_KEY } from '@/modules/controle-estoque/application/use-cases/etiqueta-layout-defaults';

// Persiste na tabela genérica system_config (chave/valor Json) — evita migration
// dedicada só para este layout.
@Injectable()
export class PrismaEtiquetaLayoutRepository implements EtiquetaLayoutRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async find(): Promise<Record<string, any> | null> {
    const row = await this.prisma.systemConfig.findUnique({
      where: { key: ETIQUETA_LAYOUT_CONFIG_KEY },
    });
    return (row?.value as Record<string, any>) ?? null;
  }

  async save(config: Record<string, any>): Promise<void> {
    await this.prisma.systemConfig.upsert({
      where:  { key: ETIQUETA_LAYOUT_CONFIG_KEY },
      update: { value: config },
      create: { key: ETIQUETA_LAYOUT_CONFIG_KEY, value: config },
    });
  }
}
