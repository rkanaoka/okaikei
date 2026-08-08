import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { PrinterRepositoryPort } from '@/modules/printing/domain/repositories/printer-repository.port';
export declare class PrismaPrinterRepository implements PrinterRepositoryPort {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findByCategory(category: string): Promise<{
        id: string;
        category: string;
        label: string | null;
        ip: string;
        port: number;
        enabled: boolean;
    }>;
}
