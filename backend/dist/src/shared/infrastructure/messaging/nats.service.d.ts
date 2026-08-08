import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Subscription } from 'nats';
export declare class NatsService implements OnModuleInit, OnModuleDestroy {
    private readonly logger;
    private nc;
    private readonly jc;
    private readonly sc;
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    private monitorStatus;
    publish(subject: string, data: Record<string, any>): void;
    subscribe(subject: string, handler: (data: any, subject: string) => void | Promise<void>): Subscription | null;
    isConnected(): boolean;
}
