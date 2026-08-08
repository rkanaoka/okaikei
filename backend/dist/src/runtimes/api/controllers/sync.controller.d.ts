import { SyncService } from '@/modules/sync/application/use-cases/sync.service';
import { SyncWorker } from '@/modules/sync/application/use-cases/sync.worker';
export declare class SyncController {
    private readonly sync;
    private readonly worker;
    constructor(sync: SyncService, worker: SyncWorker);
    status(): Promise<{
        cloudOnline: boolean;
        lastSync: Date;
        pending: number;
        failed: number;
        synced: number;
    }>;
    flush(): Promise<{
        ok: boolean;
    }>;
    receive(): {
        ok: boolean;
        message: string;
    };
    queue(page?: string): Promise<{
        total: {
            cloudOnline: boolean;
            lastSync: Date;
            pending: number;
            failed: number;
            synced: number;
        };
        status: {
            cloudOnline: boolean;
            lastSync: Date;
            pending: number;
            failed: number;
            synced: number;
        };
    }>;
}
