import { PrismaService } from '@/common/prisma/prisma.service';
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
    private readonly prisma;
    constructor(prisma: PrismaService);
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
    findByCode(rawCode: string): Promise<{
        id: string;
        code: string;
        amount: import("@prisma/client/runtime/library").Decimal;
        dueDate: Date;
        status: import(".prisma/client").$Enums.VoucherStatus;
    }>;
    confirmForUse(id: string, password: string): Promise<{
        id: string;
        code: string;
        amount: import("@prisma/client/runtime/library").Decimal;
        dueDate: Date;
        status: "PAID";
    }>;
    private validate;
    create(dto: VoucherInput): Promise<{
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
    update(id: string, dto: Partial<VoucherInput>): Promise<{
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
export {};
