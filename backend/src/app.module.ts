import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { PrismaModule }   from './common/prisma/prisma.module';
import { RedisModule }    from './common/redis/redis.module';
import { NatsModule }     from './common/nats/nats.module';
import { GatewayModule }  from './gateway/gateway.module';

import { MenuModule }     from './modules/menu/menu.module';
import { TablesModule }   from './modules/tables/tables.module';
import { OrdersModule }   from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PrintingModule } from './modules/printing/printing.module';
import { SyncModule }     from './modules/sync/sync.module';
import { ConfigsModule }  from './modules/config/config.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ScheduleModule.forRoot(),

    // Core
    PrismaModule,
    RedisModule,
    NatsModule,
    GatewayModule,

    // Features
    MenuModule,
    TablesModule,
    OrdersModule,
    PaymentsModule,
    PrintingModule,
    SyncModule,
    ConfigsModule,
  ],
})
export class AppModule {}
