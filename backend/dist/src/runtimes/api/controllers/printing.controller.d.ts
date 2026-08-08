import { PrintingService } from '@/modules/printing/application/use-cases/printing.service';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
export declare class PrintingController {
    private readonly printing;
    private readonly prisma;
    constructor(printing: PrintingService, prisma: PrismaService);
    test(category: string): Promise<{
        ok: boolean;
        message: string;
        error?: undefined;
    } | {
        ok: boolean;
        error: any;
        message?: undefined;
    }>;
    status(): Promise<{
        category: string;
        label: string;
        ip: string;
        port: number;
        enabled: boolean;
    }[]>;
    reprint(body: {
        type: 'order' | 'receipt';
        comandaId: string;
    }): Promise<{
        ok: boolean;
        error: string;
    } | {
        ok: boolean;
        error?: undefined;
    }>;
}
