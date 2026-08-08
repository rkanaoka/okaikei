export declare const PRINTER_REPOSITORY_PORT: unique symbol;
export interface PrinterRepositoryPort {
    findByCategory(category: string): Promise<{
        ip: string;
        port: number;
        label?: string | null;
        enabled: boolean;
    } | null>;
}
