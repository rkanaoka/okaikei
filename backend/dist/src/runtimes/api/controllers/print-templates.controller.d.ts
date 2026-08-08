import { PrintTemplatesService } from '@/modules/print-templates/application/use-cases/print-templates.service';
import { PrintingService } from '@/modules/printing/application/use-cases/printing.service';
export declare class PrintTemplatesController {
    private readonly templates;
    private readonly printing;
    constructor(templates: PrintTemplatesService, printing: PrintingService);
    list(): Promise<{
        type: "kitchen" | "bar" | "receipt" | "fiscal";
        label: string;
        enabled: boolean;
        config: {
            [x: string]: any;
        };
    }[]>;
    get(type: string): Promise<{
        type: "kitchen" | "bar" | "receipt" | "fiscal";
        label: string;
        enabled: boolean;
        config: {
            [x: string]: any;
        };
    }>;
    update(type: string, body: {
        enabled?: boolean;
        config?: Record<string, any>;
    }): Promise<{
        type: "kitchen" | "bar" | "receipt" | "fiscal";
        label: string;
        enabled: boolean;
        config: {
            [x: string]: any;
        };
    }>;
    reset(type: string): Promise<{
        type: "kitchen" | "bar" | "receipt" | "fiscal";
        label: string;
        enabled: boolean;
        config: {
            [x: string]: any;
        };
    }>;
    test(type: string, body: {
        enabled?: boolean;
        config?: Record<string, any>;
    }): Promise<{
        ok: boolean;
        error?: undefined;
    } | {
        ok: boolean;
        error: any;
    }>;
}
