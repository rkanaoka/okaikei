import { OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { EventsGateway } from '@/gateway/events.gateway';
import { SyncService } from './sync.service';
export declare class SyncWorker implements OnModuleInit {
    private readonly prisma;
    private readonly redis;
    private readonly gateway;
    private readonly sync;
    private readonly logger;
    private processing;
    constructor(prisma: PrismaService, redis: RedisService, gateway: EventsGateway, sync: SyncService);
    onModuleInit(): void;
    process(): Promise<void>;
    private sendBatch;
    checkConnectivity(): Promise<void>;
}
