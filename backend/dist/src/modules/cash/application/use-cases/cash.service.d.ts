import { CashRepositoryPort } from '@/modules/cash/domain/repositories/cash-repository.port';
import { CashMovementType } from '@prisma/client';
export declare class CashService {
    private readonly repo;
    constructor(repo: CashRepositoryPort);
    list(dto: {
        from?: string;
        to?: string;
    }): Promise<any[]>;
    private withDivergence;
    getCurrent(): Promise<{
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
    open(dto: {
        openingAmount: number;
        notes?: string;
    }): Promise<any>;
    addMovement(sessionId: string, dto: {
        type: CashMovementType;
        amount: number;
        notes?: string;
    }): Promise<any>;
    getSummary(sessionId: string): Promise<{
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
    close(sessionId: string, dto: {
        closingCounts: Record<string, number>;
        notes?: string;
    }): Promise<any>;
}
