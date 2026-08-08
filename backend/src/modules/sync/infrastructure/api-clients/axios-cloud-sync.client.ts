import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { CloudSyncApiClientPort } from '@/modules/sync/application/contracts/cloud-sync-api-client.port';
import { SyncEvent } from '@/modules/sync/domain/repositories/sync-queue-repository.port';

@Injectable()
export class AxiosCloudSyncClient implements CloudSyncApiClientPort {
  private readonly logger = new Logger(AxiosCloudSyncClient.name);

  async sendBatch(cloudUrl: string, events: SyncEvent[]): Promise<boolean> {
    try {
      const response = await axios.post(
        `${cloudUrl}/ingest`,
        {
          events: events.map((e) => ({
            id:        e.id,
            type:      e.eventType,
            entity:    e.entityType,
            entityId:  e.entityId,
            payload:   e.payload,
            createdAt: e.createdAt,
          })),
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key':    process.env.CLOUD_API_KEY ?? '',
            'X-Restaurant': 'bodogami-sp',
          },
          timeout: 8000,
        },
      );
      return response.status >= 200 && response.status < 300;
    } catch (err) {
      this.logger.warn(`Cloud API unreachable: ${err.message}`);
      return false;
    }
  }

  async checkHealth(cloudUrl: string): Promise<boolean> {
    try {
      await axios.get(`${cloudUrl}/health`, { timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }
}
