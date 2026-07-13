import { PrismaService } from '@/common/prisma/prisma.service';
import { CashMovementType } from '@prisma/client';
export declare class CashService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getCurrent(): Promise<{
        session: {
            id: string;
            status: import(".prisma/client").$Enums.CashSessionStatus;
            openedAt: Date;
            closedAt: Date | null;
            openingAmount: import("@prisma/client/runtime/library").Decimal;
            openingNotes: string | null;
            closingNotes: string | null;
            closingCounts: import("@prisma/client/runtime/library").JsonValue | null;
        };
        elapsedMinutes: number;
        movements: {
            id: string;
            createdAt: Date;
            type: import(".prisma/client").$Enums.CashMovementType;
            notes: string | null;
            amount: import("@prisma/client/runtime/library").Decimal;
            cashSessionId: string;
        }[];
        methods: ({
            method: "CASH";
            sales: number;
            esperado: number;
            opening: number;
            withdrawals: number;
            reinforcements: number;
        } | {
            method: "CARD" | "PIX" | "VOUCHER";
            sales: number;
            esperado: number;
            opening: number;
            withdrawals: number;
            reinforcements: number;
        })[];
        totalEsperado: number;
    }>;
    open(dto: {
        openingAmount: number;
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
    addMovement(sessionId: string, dto: {
        type: CashMovementType;
        amount: number;
        notes?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        type: import(".prisma/client").$Enums.CashMovementType;
        notes: string | null;
        amount: import("@prisma/client/runtime/library").Decimal;
        cashSessionId: string;
    }>;
    getSummary(sessionId: string): Promise<{
        session: {
            id: string;
            status: import(".prisma/client").$Enums.CashSessionStatus;
            openedAt: Date;
            closedAt: Date | null;
            openingAmount: import("@prisma/client/runtime/library").Decimal;
            openingNotes: string | null;
            closingNotes: string | null;
            closingCounts: import("@prisma/client/runtime/library").JsonValue | null;
        };
        elapsedMinutes: number;
        movements: {
            id: string;
            createdAt: Date;
            type: import(".prisma/client").$Enums.CashMovementType;
            notes: string | null;
            amount: import("@prisma/client/runtime/library").Decimal;
            cashSessionId: string;
        }[];
        methods: ({
            method: "CASH";
            sales: number;
            esperado: number;
            opening: number;
            withdrawals: number;
            reinforcements: number;
        } | {
            method: "CARD" | "PIX" | "VOUCHER";
            sales: number;
            esperado: number;
            opening: number;
            withdrawals: number;
            reinforcements: number;
        })[];
        totalEsperado: number;
    }>;
    close(sessionId: string, dto: {
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
}
