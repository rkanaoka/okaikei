import { CashService } from './cash.service';
import { CashMovementType } from '@prisma/client';
export declare class CashController {
    private readonly cash;
    constructor(cash: CashService);
    list(from?: string, to?: string): Promise<any[]>;
    current(): Promise<{
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
    open(body: {
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
    addMovement(id: string, body: {
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
    summary(id: string): Promise<{
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
    close(id: string, body: {
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
