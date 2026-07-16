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
import { CashModule }     from './modules/cash/cash.module';
import { ReasonsModule }  from './modules/reasons/reasons.module';
import { PrintTemplatesModule } from './modules/print-templates/print-templates.module';
import { OptionGroupsModule } from './modules/option-groups/option-groups.module';
import { VouchersModule } from './modules/vouchers/vouchers.module';

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
    CashModule,
    ReasonsModule,
    PrintTemplatesModule,
    OptionGroupsModule,
    VouchersModule,
  ],
})
export class AppModule {}
