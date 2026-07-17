import { VouchersService } from './vouchers.service';
export declare class VouchersController {
    private readonly vouchers;
    constructor(vouchers: VouchersService);
    list(): Promise<{
        id: string;
        customerName: string;
        status: import(".prisma/client").$Enums.VoucherStatus;
        createdAt: Date;
        updatedAt: Date;
        comandaId: string | null;
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
    findByCode(code: string): Promise<{
        id: string;
        code: string;
        amount: import("@prisma/client/runtime/library").Decimal;
        dueDate: Date;
        status: import(".prisma/client").$Enums.VoucherStatus;
    }>;
    confirm(id: string, body: {
        password: string;
    }): Promise<{
        id: string;
        code: string;
        amount: import("@prisma/client/runtime/library").Decimal;
        dueDate: Date;
        status: "PAID";
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
    }): Promise<{
        id: string;
        customerName: string;
        status: import(".prisma/client").$Enums.VoucherStatus;
        createdAt: Date;
        updatedAt: Date;
        comandaId: string | null;
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
        customerName: string;
        status: import(".prisma/client").$Enums.VoucherStatus;
        createdAt: Date;
        updatedAt: Date;
        comandaId: string | null;
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
