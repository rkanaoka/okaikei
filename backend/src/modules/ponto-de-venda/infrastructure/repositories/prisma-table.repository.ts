import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { TableRepositoryPort } from '@/modules/ponto-de-venda/domain/repositories/table-repository.port';

@Injectable()
export class PrismaTableRepository implements TableRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.table.findMany({
      include: { comandas: { where: { status: { in: ['OPEN', 'PREPARING'] } } } },
      orderBy: { number: 'asc' },
    });
  }

  async findById(id: string) {
    return this.prisma.table.findUnique({ where: { id } });
  }

  async create(data: { id: string; number: number; label: string; capacity?: number }) {
    return this.prisma.table.create({ data });
  }

  async update(id: string, data: Partial<{ number: number; label: string; capacity: number; status: string }>) {
    return this.prisma.table.update({ where: { id }, data: data as any });
  }

  async remove(id: string) {
    return this.prisma.table.delete({ where: { id } });
  }

  async setStatus(id: string, status: string) {
    return this.prisma.table.update({ where: { id }, data: { status: status as any } });
  }
}
