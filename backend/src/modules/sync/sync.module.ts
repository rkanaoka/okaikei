import { Module }         from '@nestjs/common';
import { SyncService }    from './sync.service';
import { SyncWorker }     from './sync.worker';
import { SyncController } from './sync.controller';

@Module({
  controllers: [SyncController],
  providers:   [SyncService, SyncWorker],
  exports:     [SyncService],
})
export class SyncModule {}
