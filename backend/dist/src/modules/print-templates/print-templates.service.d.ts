import { PrismaService } from '@/common/prisma/prisma.service';
import { TemplateType } from './print-template-defaults';
export declare class PrintTemplatesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
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
