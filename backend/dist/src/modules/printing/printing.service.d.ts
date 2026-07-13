import { PrismaService } from '@/common/prisma/prisma.service';
export declare class PrintingService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    private send;
    private getPrinter;
    private getTemplate;
    printOrderItems(comanda: any, items: any[]): Promise<void>;
    printReceipt(comanda: any, payments: any[], total: number): Promise<void>;
    printTest(category: string, printer: {
        ip: string;
        port: number;
        label?: string | null;
    }): Promise<void>;
    printTemplateSample(type: string, override: {
        enabled?: boolean;
        config?: Record<string, any>;
    }): Promise<void>;
    private buildOrderTicket;
    private buildReceiptTicket;
    private buildFiscalTicket;
}
