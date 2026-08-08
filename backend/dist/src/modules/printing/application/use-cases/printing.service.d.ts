import { PrinterRepositoryPort } from '@/modules/printing/domain/repositories/printer-repository.port';
import { EscPosClientPort } from '@/modules/printing/application/contracts/esc-pos-client.port';
import { PrintTemplatesService } from '@/modules/print-templates/application/use-cases/print-templates.service';
export declare class PrintingService {
    private readonly printerRepo;
    private readonly escPos;
    private readonly templates;
    private readonly logger;
    constructor(printerRepo: PrinterRepositoryPort, escPos: EscPosClientPort, templates: PrintTemplatesService);
    private getPrinter;
    private getTemplate;
    printOrderItems(comanda: any, items: any[]): Promise<void>;
    printReceipt(comanda: any, payments: any[], total: number): Promise<void>;
    printSummary(comanda: any): Promise<void>;
    printMergeReceipt(table: any, snapshot: any[], merged: any): Promise<void>;
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
    private buildSummaryTicket;
    private buildMergeReceiptTicket;
}
