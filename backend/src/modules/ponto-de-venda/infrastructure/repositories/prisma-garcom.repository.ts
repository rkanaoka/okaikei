import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { GarcomRepositoryPort } from '@/modules/ponto-de-venda/domain/repositories/garcom-repository.port';

const GARCOM_INCLUDE = {
  user: { select: { id: true, name: true, email: true } },
};

@Injectable()
export class PrismaGarcomRepository implements GarcomRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return (this.prisma as any).garcom.findMany({
      include: GARCOM_INCLUDE,
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    return (this.prisma as any).garcom.findUnique({ where: { id }, include: GARCOM_INCLUDE });
  }

  async findByCode(code: string) {
    return (this.prisma as any).garcom.findUnique({ where: { code }, include: GARCOM_INCLUDE });
  }

  async create(data: { id: string; code: string; name: string; userId?: string | null }) {
    return (this.prisma as any).garcom.create({ data, include: GARCOM_INCLUDE });
  }

  async update(id: string, data: Partial<{ name: string; userId: string | null; active: boolean }>) {
    return (this.prisma as any).garcom.update({ where: { id }, data, include: GARCOM_INCLUDE });
  }
}
