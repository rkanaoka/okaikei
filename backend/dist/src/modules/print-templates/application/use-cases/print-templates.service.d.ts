import { PrintTemplateRepositoryPort } from '@/modules/print-templates/domain/repositories/print-template-repository.port';
import { TemplateType } from './print-template-defaults';
export declare class PrintTemplatesService {
    private readonly repo;
    constructor(repo: PrintTemplateRepositoryPort);
    private merge;
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
    update(type: string, dto: {
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
    getEffective(type: TemplateType): Promise<{
        type: "kitchen" | "bar" | "receipt" | "fiscal";
        label: string;
        enabled: boolean;
        config: {
            [x: string]: any;
        };
    }>;
}
