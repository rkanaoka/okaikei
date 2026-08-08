import { VouchersService } from '@/modules/vouchers/application/use-cases/vouchers.service';
export declare class VouchersController {
    private readonly vouchers;
    constructor(vouchers: VouchersService);
    list(): Promise<any[]>;
    findByCode(code: string): Promise<{
        id: any;
        code: any;
        amount: any;
        dueDate: any;
        status: any;
    }>;
    confirm(id: string, body: {
        password: string;
    }): Promise<{
        id: any;
        code: any;
        amount: any;
        dueDate: any;
        status: any;
    }>;
    create(body: {
        customerName: string;
        customerCpf: string;
        customerBirthDate: string;
        customerAddress: string;
        customerPhone: string;
        customerEmail: string;
        amount: number;
        dueDate: string;
        status?: string;
    }): Promise<any>;
    update(id: string, body: {
        customerName?: string;
        customerCpf?: string;
        customerBirthDate?: string;
        customerAddress?: string;
        customerPhone?: string;
        customerEmail?: string;
        amount?: number;
        dueDate?: string;
        status?: string;
    }): Promise<any>;
}
