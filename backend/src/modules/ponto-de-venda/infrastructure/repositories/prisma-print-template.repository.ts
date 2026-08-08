import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { PrintTemplateRepositoryPort } from '@/modules/ponto-de-venda/domain/repositories/print-template-repository.port';
import { uuidv7 } from 'uuidv7';

@Injectable()
export class PrismaPrintTemplateRepository implements PrintTemplateRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.printTemplate.findMany();
  }

  async findByType(type: string) {
    return this.prisma.printTemplate.findUnique({ where: { type } });
  }

  async upsert(type: string, data: { enabled: boolean; config: any }) {
    return this.prisma.printTemplate.upsert({
      where:  { type },
      update: { enabled: data.enabled, config: data.config },
      create: { id: uuidv7(), type, enabled: data.enabled, config: data.config },
    });
  }
}
