import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { VoucherRepositoryPort } from '@/modules/vouchers/domain/repositories/voucher-repository.port';
export declare class PrismaVoucherRepository implements VoucherRepositoryPort {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private get v();
    findAll(filter?: {
        status?: string;
        search?: string;
    }): Promise<any>;
    findById(id: string): Promise<any>;
    findByCode(code: string): Promise<any>;
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
