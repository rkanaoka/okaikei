import { Module } from '@nestjs/common';
import { OrdersController }  from '@/runtimes/api/controllers/orders.controller';
import { OrdersService }     from './application/use-cases/orders.service';
import { SyncModule }        from '@/modules/sync/sync.module';
import { PrintingModule }    from '@/modules/printing/printing.module';
import { ORDERS_REPOSITORY_PORT }         from './domain/repositories/orders-repository.port';
import { PrismaOrdersRepository }         from './infrastructure/repositories/prisma-orders.repository';
import { COMANDA_EVENT_PUBLISHER_PORT }   from './application/contracts/comanda-event-publisher.port';
import { NatsComandaPublisher }           from './infrastructure/publishers/nats-comanda.publisher';

@Module({
  imports:     [SyncModule, PrintingModule],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    { provide: ORDERS_REPOSITORY_PORT,       useClass: PrismaOrdersRepository },
    { provide: COMANDA_EVENT_PUBLISHER_PORT, useClass: NatsComandaPublisher },
  ],
  exports: [OrdersService],
})
export class OrdersModule {}
