import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { PrismaModule }   from '@/shared/infrastructure/database/prisma.module';
import { RedisModule }    from '@/shared/infrastructure/cache/redis.module';
import { NatsModule }     from '@/shared/infrastructure/messaging/nats.module';
import { GatewayModule }  from '@/runtimes/api/websocket/gateway.module';

import { PontoDeVendaModule }    from '@/modules/ponto-de-venda/ponto-de-venda.module';
import { SyncModule }            from '@/modules/sync/sync.module';
import { ConfigsModule }         from '@/modules/config/config.module';
import { ControleEstoqueModule } from '@/modules/controle-estoque/controle-estoque.module';

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
    PontoDeVendaModule,
    SyncModule,
    ConfigsModule,
    ControleEstoqueModule,
  ],
})
export class AppModule {}
