import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { PrinterRepositoryPort } from '@/modules/ponto-de-venda/domain/repositories/printer-repository.port';

@Injectable()
export class PrismaPrinterRepository implements PrinterRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByCategory(category: string) {
    return this.prisma.printer.findUnique({ where: { category } });
  }
}
