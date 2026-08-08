export declare const VOUCHER_REPOSITORY_PORT: unique symbol;
export interface VoucherRepositoryPort {
    findAll(filter?: {
        status?: string;
        search?: string;
    }): Promise<any[]>;
    findById(id: string): Promise<any | null>;
    findByCode(code: string): Promise<any | null>;
    create(data: {
        id: string;
        code: string;
        password: string;
        customerName: string;
        customerCpf: string;
        customerBirthDate: Date;
        customerAddress: string;
        customerPhone: string;
        customerEmail: string;
        amount: number;
        dueDate: Date;
        status: string;
    }): Promise<any>;
    update(id: string, data: Partial<{
        customerName: string;
        customerCpf: string;
        customerBirthDate: Date;
        customerAddress: string;
        customerPhone: string;
        customerEmail: string;
        amount: number;
        dueDate: Date;
        status: string;
    }>): Promise<any>;
    updateStatus(id: string, status: string): Promise<any>;
}
