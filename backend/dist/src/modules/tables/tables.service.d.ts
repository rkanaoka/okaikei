import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { SyncService } from '@/modules/sync/sync.service';
export declare class TablesService {
    private readonly prisma;
    private readonly redis;
    private readonly sync;
    constructor(prisma: PrismaService, redis: RedisService, sync: SyncService);
    findAll(): Promise<any[]>;
    create(dto: {
        number: number;
        label: string;
        capacity?: number;
    }): Promise<{
        number: number;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        label: string;
        capacity: number;
        status: import(".prisma/client").$Enums.TableStatus;
    }>;
    update(id: string, dto: Partial<{
        label: string;
        capacity: number;
    }>): Promise<{
        number: number;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        label: string;
        capacity: number;
        status: import(".prisma/client").$Enums.TableStatus;
    }>;
}
