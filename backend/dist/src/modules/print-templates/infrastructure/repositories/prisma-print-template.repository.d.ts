import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { PrintTemplateRepositoryPort } from '@/modules/print-templates/domain/repositories/print-template-repository.port';
export declare class PrismaPrintTemplateRepository implements PrintTemplateRepositoryPort {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<{
        id: string;
        updatedAt: Date;
        type: string;
        enabled: boolean;
        config: import("@prisma/client/runtime/library").JsonValue;
    }[]>;
    findByType(type: string): Promise<{
        id: string;
        updatedAt: Date;
        type: string;
        enabled: boolean;
        config: import("@prisma/client/runtime/library").JsonValue;
    }>;
    upsert(type: string, data: {
        enabled: boolean;
        config: any;
    }): Promise<{
        id: string;
        updatedAt: Date;
        type: string;
        enabled: boolean;
        config: import("@prisma/client/runtime/library").JsonValue;
    }>;
}
