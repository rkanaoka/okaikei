export const SYNC_QUEUE_REPOSITORY_PORT = Symbol('SyncQueueRepositoryPort');

export interface SyncEvent {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string;
  payload: Record<string, any>;
  status: string;
  attempts: number;
  nextRetry: Date;
  createdAt: Date;
}

export interface SyncQueueRepositoryPort {
  enqueue(data: {
    id: string; eventType: string; entityType: string;
    entityId: string; payload: Record<string, any>;
    status: string; nextRetry: Date;
  }): Promise<void>;

  countByStatus(statuses: string[]): Promise<number>;

  countAllStatuses(): Promise<{ pending: number; failed: number; synced: number }>;

  findLastSynced(): Promise<{ syncedAt: Date } | null>;

  requeueExpiredFailed(maxAttempts: number): Promise<number>;

  findPendingBatch(limit: number): Promise<SyncEvent[]>;

  markInProgress(ids: string[]): Promise<void>;

  markSynced(ids: string[]): Promise<void>;

  markFailed(event: SyncEvent, errorMessage: string, maxAttempts: number, retryDelaysMs: number[]): Promise<void>;
}
