import { CashService } from '@/modules/cash/application/use-cases/cash.service';
import { CashMovementType } from '@prisma/client';
export declare class CashController {
    private readonly cash;
    constructor(cash: CashService);
    list(from?: string, to?: string): Promise<any[]>;
    current(): Promise<{
        session: any;
        elapsedMinutes: number;
        movements: any[];
        methods: ({
            method: "CASH";
            sales: number;
            esperado: any;
            opening: number;
            withdrawals: any;
            reinforcements: any;
        } | {
            method: "CARD" | "PIX" | "VOUCHER";
            sales: number;
            esperado: number;
            opening: number;
            withdrawals: number;
            reinforcements: number;
        })[];
        totalEsperado: any;
    }>;
    open(body: {
        openingAmount: number;
        notes?: string;
    }): Promise<any>;
    addMovement(id: string, body: {
        type: CashMovementType;
        amount: number;
        notes?: string;
    }): Promise<any>;
    summary(id: string): Promise<{
        session: any;
        elapsedMinutes: number;
        movements: any[];
        methods: ({
            method: "CASH";
            sales: number;
            esperado: any;
            opening: number;
            withdrawals: any;
            reinforcements: any;
        } | {
            method: "CARD" | "PIX" | "VOUCHER";
            sales: number;
            esperado: number;
            opening: number;
            withdrawals: number;
            reinforcements: number;
        })[];
        totalEsperado: any;
    }>;
    close(id: string, body: {
        closingCounts: Record<string, number>;
        notes?: string;
    }): Promise<any>;
}
