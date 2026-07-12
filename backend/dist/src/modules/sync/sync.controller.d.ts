import { SyncService } from './sync.service';
import { SyncWorker } from './sync.worker';
export declare class SyncController {
    private readonly sync;
    private readonly worker;
    constructor(sync: SyncService, worker: SyncWorker);
    status(): Promise<{
        pending: number;
        failed: number;
        synced: number;
        cloudOnline: boolean;
        lastSync: Date;
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
            pending: number;
            failed: number;
            synced: number;
            cloudOnline: boolean;
            lastSync: Date;
        };
        status: {
            pending: number;
            failed: number;
            synced: number;
            cloudOnline: boolean;
            lastSync: Date;
        };
    }>;
}
