import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CashRepositoryPort } from '@/modules/cash/domain/repositories/cash-repository.port';
import { CashMovementType } from '@prisma/client';
export declare class PrismaCashRepository implements CashRepositoryPort {
    private readonly prisma;
    constructor(prisma: PrismaService);
    listSessions(filter?: {
        from?: Date;
        to?: Date;
    }): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.CashSessionStatus;
        openedAt: Date;
        closedAt: Date | null;
        openingAmount: import("@prisma/client/runtime/library").Decimal;
        openingNotes: string | null;
        closingNotes: string | null;
        closingCounts: import("@prisma/client/runtime/library").JsonValue | null;
    }[]>;
    findSessionById(id: string): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.CashSessionStatus;
        openedAt: Date;
        closedAt: Date | null;
        openingAmount: import("@prisma/client/runtime/library").Decimal;
        openingNotes: string | null;
        closingNotes: string | null;
        closingCounts: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    findOpenSession(): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.CashSessionStatus;
        openedAt: Date;
        closedAt: Date | null;
        openingAmount: import("@prisma/client/runtime/library").Decimal;
        openingNotes: string | null;
        closingNotes: string | null;
        closingCounts: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    createSession(data: {
        id: string;
        openingAmount: number;
        openingNotes?: string;
    }): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.CashSessionStatus;
        openedAt: Date;
        closedAt: Date | null;
        openingAmount: import("@prisma/client/runtime/library").Decimal;
        openingNotes: string | null;
        closingNotes: string | null;
        closingCounts: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    closeSession(id: string, data: {
        closingCounts: Record<string, number>;
        notes?: string;
    }): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.CashSessionStatus;
        openedAt: Date;
        closedAt: Date | null;
        openingAmount: import("@prisma/client/runtime/library").Decimal;
        openingNotes: string | null;
        closingNotes: string | null;
        closingCounts: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    getSessionPayments(sessionId: string): Promise<{
        id: string;
        createdAt: Date;
        notes: string | null;
        comandaId: string;
        method: import(".prisma/client").$Enums.PaymentMethod;
        amount: import("@prisma/client/runtime/library").Decimal;
        paidAt: Date;
        cashSessionId: string | null;
    }[]>;
    getSessionMovements(sessionId: string): Promise<{
        id: string;
        createdAt: Date;
        notes: string | null;
        amount: import("@prisma/client/runtime/library").Decimal;
        cashSessionId: string;
        type: import(".prisma/client").$Enums.CashMovementType;
    }[]>;
    addMovement(data: {
        id: string;
        cashSessionId: string;
        type: CashMovementType;
        amount: number;
        notes?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        notes: string | null;
        amount: import("@prisma/client/runtime/library").Decimal;
        cashSessionId: string;
        type: import(".prisma/client").$Enums.CashMovementType;
    }>;
}
