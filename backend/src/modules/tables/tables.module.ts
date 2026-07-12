import { Module }           from '@nestjs/common';
import { TablesController } from './tables.controller';
import { TablesService }    from './tables.service';
import { SyncModule }       from '@/modules/sync/sync.module';

@Module({
  imports:     [SyncModule],
  controllers: [TablesController],
  providers:   [TablesService],
  exports:     [TablesService],
})
export class TablesModule {}
