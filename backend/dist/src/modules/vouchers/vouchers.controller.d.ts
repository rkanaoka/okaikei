import { VouchersService } from './vouchers.service';
export declare class VouchersController {
    private readonly vouchers;
    constructor(vouchers: VouchersService);
    list(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.VoucherStatus;
        customerName: string;
        amount: import("@prisma/client/runtime/library").Decimal;
        code: string;
        confirmationPassword: string;
        customerCpf: string;
        customerBirthDate: Date;
        customerAddress: string;
        customerPhone: string;
        customerEmail: string;
        dueDate: Date;
    }[]>;
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
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.VoucherStatus;
        customerName: string;
        amount: import("@prisma/client/runtime/library").Decimal;
        code: string;
        confirmationPassword: string;
        customerCpf: string;
        customerBirthDate: Date;
        customerAddress: string;
        customerPhone: string;
        customerEmail: string;
        dueDate: Date;
    }>;
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
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.VoucherStatus;
        customerName: string;
        amount: import("@prisma/client/runtime/library").Decimal;
        code: string;
        confirmationPassword: string;
        customerCpf: string;
        customerBirthDate: Date;
        customerAddress: string;
        customerPhone: string;
        customerEmail: string;
        dueDate: Date;
    }>;
}
