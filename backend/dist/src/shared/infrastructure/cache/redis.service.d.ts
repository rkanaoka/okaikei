import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
export declare class RedisService implements OnModuleInit, OnModuleDestroy {
    private readonly logger;
    private client;
    onModuleInit(): void;
    onModuleDestroy(): Promise<void>;
    get<T = any>(key: string): Promise<T | null>;
    set(key: string, value: any, ttl?: number): Promise<void>;
    del(key: string): Promise<void>;
    invalidatePattern(pattern: string): Promise<void>;
    cacheMenu(items: any[]): Promise<void>;
    getMenu(): Promise<any[] | null>;
    cacheTables(tables: any[]): Promise<void>;
    getTables(): Promise<any[] | null>;
    invalidateMenu(): Promise<void>;
    invalidateTables(): Promise<void>;
    setCloudStatus(online: boolean): Promise<void>;
    isCloudOnline(): Promise<boolean>;
}
