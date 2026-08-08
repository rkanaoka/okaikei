import { Module }           from '@nestjs/common';
import { TablesController } from '@/runtimes/api/controllers/tables.controller';
import { TablesService }    from './application/use-cases/tables.service';
import { SyncModule }       from '@/modules/sync/sync.module';
import { TABLE_REPOSITORY_PORT }   from './domain/repositories/table-repository.port';
import { PrismaTableRepository }   from './infrastructure/repositories/prisma-table.repository';

@Module({
  imports:     [SyncModule],
  controllers: [TablesController],
  providers: [
    TablesService,
    { provide: TABLE_REPOSITORY_PORT, useClass: PrismaTableRepository },
  ],
  exports: [TablesService],
})
export class TablesModule {}
