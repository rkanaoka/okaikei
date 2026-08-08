import { VoucherRepositoryPort } from '@/modules/vouchers/domain/repositories/voucher-repository.port';
type VoucherInput = {
    customerName: string;
    customerCpf: string;
    customerBirthDate: string;
    customerAddress: string;
    customerPhone: string;
    customerEmail: string;
    amount: number;
    dueDate: string;
    status?: string;
};
export declare class VouchersService {
    private readonly repo;
    constructor(repo: VoucherRepositoryPort);
    list(): Promise<any[]>;
    findByCode(rawCode: string): Promise<{
        id: any;
        code: any;
        amount: any;
        dueDate: any;
        status: any;
    }>;
    confirmForUse(id: string, password: string): Promise<{
        id: any;
        code: any;
        amount: any;
        dueDate: any;
        status: any;
    }>;
    private validate;
    create(dto: VoucherInput): Promise<any>;
    update(id: string, dto: Partial<VoucherInput>): Promise<any>;
}
export {};
