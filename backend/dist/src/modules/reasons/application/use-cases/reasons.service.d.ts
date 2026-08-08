import { ReasonsRepositoryPort } from '@/modules/reasons/domain/repositories/reasons-repository.port';
export declare class ReasonsService {
    private readonly repo;
    constructor(repo: ReasonsRepositoryPort);
    listCancellationReasons(): Promise<any[]>;
    createCancellationReason(dto: {
        label: string;
    }): Promise<any>;
    listCancellationHistory(): Promise<any[]>;
    listDiscountReasons(): Promise<any[]>;
    createDiscountReason(dto: {
        label: string;
        type: 'percent' | 'fixed';
        value: number;
    }): Promise<any>;
}
