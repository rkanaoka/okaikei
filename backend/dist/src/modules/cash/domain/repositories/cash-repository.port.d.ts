import { CashMovementType } from '@prisma/client';
export declare const CASH_REPOSITORY_PORT: unique symbol;
export interface CashRepositoryPort {
    listSessions(filter?: {
        from?: Date;
        to?: Date;
    }): Promise<any[]>;
    findSessionById(id: string): Promise<any | null>;
    findOpenSession(): Promise<any | null>;
    createSession(data: {
        id: string;
        openingAmount: number;
        openingNotes?: string;
    }): Promise<any>;
    closeSession(id: string, data: {
        closingCounts: Record<string, number>;
        notes?: string;
    }): Promise<any>;
    getSessionPayments(sessionId: string): Promise<any[]>;
    getSessionMovements(sessionId: string): Promise<any[]>;
    addMovement(data: {
        id: string;
        cashSessionId: string;
        type: CashMovementType;
        amount: number;
        notes?: string;
    }): Promise<any>;
}
