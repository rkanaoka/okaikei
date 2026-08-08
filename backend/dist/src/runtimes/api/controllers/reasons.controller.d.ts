import { ReasonsService } from '@/modules/reasons/application/use-cases/reasons.service';
export declare class ReasonsController {
    private readonly reasons;
    constructor(reasons: ReasonsService);
    listCancellation(): Promise<any[]>;
    createCancellation(body: {
        label: string;
    }): Promise<any>;
    cancellationHistory(): Promise<any[]>;
    listDiscount(): Promise<any[]>;
    createDiscount(body: {
        label: string;
        type: 'percent' | 'fixed';
        value: number;
    }): Promise<any>;
}
