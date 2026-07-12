import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService }    from './orders.service';
import { SyncModule }       from '@/modules/sync/sync.module';
import { PrintingModule }   from '@/modules/printing/printing.module';

@Module({
  imports:     [SyncModule, PrintingModule],
  controllers: [OrdersController],
  providers:   [OrdersService],
  exports:     [OrdersService],
})
export class OrdersModule {}
