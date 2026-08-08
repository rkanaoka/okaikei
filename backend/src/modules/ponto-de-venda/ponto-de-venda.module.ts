import { Module } from '@nestjs/common';
import { SyncModule } from '@/modules/sync/sync.module';

// Domain — Repository Ports (tokens)
import { MENU_REPOSITORY_PORT }           from './domain/repositories/menu-repository.port';
import { OPTION_GROUP_REPOSITORY_PORT }   from './domain/repositories/option-group-repository.port';
import { ORDERS_REPOSITORY_PORT }         from './domain/repositories/orders-repository.port';
import { TABLE_REPOSITORY_PORT }          from './domain/repositories/table-repository.port';
import { CASH_REPOSITORY_PORT }           from './domain/repositories/cash-repository.port';
import { VOUCHER_REPOSITORY_PORT }        from './domain/repositories/voucher-repository.port';
import { PRINTER_REPOSITORY_PORT }        from './domain/repositories/printer-repository.port';
import { PRINT_TEMPLATE_REPOSITORY_PORT } from './domain/repositories/print-template-repository.port';
import { REASONS_REPOSITORY_PORT }        from './domain/repositories/reasons-repository.port';

// Application — Contracts (tokens)
import { COMANDA_EVENT_PUBLISHER_PORT }   from './application/contracts/comanda-event-publisher.port';
import { ESC_POS_CLIENT_PORT }            from './application/contracts/esc-pos-client.port';

// Application — Use Cases (Services)
import { MenuService }           from './application/use-cases/menu.service';
import { OptionGroupsService }   from './application/use-cases/option-groups.service';
import { OrdersService }         from './application/use-cases/orders.service';
import { TablesService }         from './application/use-cases/tables.service';
import { CashService }           from './application/use-cases/cash.service';
import { VouchersService }       from './application/use-cases/vouchers.service';
import { PrintingService }       from './application/use-cases/printing.service';
import { PrintTemplatesService } from './application/use-cases/print-templates.service';
import { ReasonsService }        from './application/use-cases/reasons.service';

// Infrastructure — Repository Adapters
import { PrismaMenuRepository }          from './infrastructure/repositories/prisma-menu.repository';
import { PrismaOptionGroupRepository }   from './infrastructure/repositories/prisma-option-group.repository';
import { PrismaOrdersRepository }        from './infrastructure/repositories/prisma-orders.repository';
import { PrismaTableRepository }         from './infrastructure/repositories/prisma-table.repository';
import { PrismaCashRepository }          from './infrastructure/repositories/prisma-cash.repository';
import { PrismaVoucherRepository }       from './infrastructure/repositories/prisma-voucher.repository';
import { PrismaPrinterRepository }       from './infrastructure/repositories/prisma-printer.repository';
import { PrismaPrintTemplateRepository } from './infrastructure/repositories/prisma-print-template.repository';
import { PrismaReasonsRepository }       from './infrastructure/repositories/prisma-reasons.repository';

// Infrastructure — Publishers & API Clients
import { NatsComandaPublisher } from './infrastructure/publishers/nats-comanda.publisher';
import { TcpEscPosClient }      from './infrastructure/api-clients/tcp-esc-pos.client';

// Controllers
import { MenuController }          from '@/runtimes/api/controllers/menu.controller';
import { OptionGroupsController }  from '@/runtimes/api/controllers/option-groups.controller';
import { OrdersController }        from '@/runtimes/api/controllers/orders.controller';
import { TablesController }        from '@/runtimes/api/controllers/tables.controller';
import { CashController }          from '@/runtimes/api/controllers/cash.controller';
import { VouchersController }      from '@/runtimes/api/controllers/vouchers.controller';
import { PrintingController }      from '@/runtimes/api/controllers/printing.controller';
import { PrintTemplatesController } from '@/runtimes/api/controllers/print-templates.controller';
import { ReasonsController }       from '@/runtimes/api/controllers/reasons.controller';

@Module({
  imports: [SyncModule],
  controllers: [
    MenuController,
    OptionGroupsController,
    OrdersController,
    TablesController,
    CashController,
    VouchersController,
    PrintingController,
    PrintTemplatesController,
    ReasonsController,
  ],
  providers: [
    // Services
    MenuService,
    OptionGroupsService,
    OrdersService,
    TablesService,
    CashService,
    VouchersService,
    PrintingService,
    PrintTemplatesService,
    ReasonsService,

    // Repository Port → Adapter bindings
    { provide: MENU_REPOSITORY_PORT,           useClass: PrismaMenuRepository },
    { provide: OPTION_GROUP_REPOSITORY_PORT,   useClass: PrismaOptionGroupRepository },
    { provide: ORDERS_REPOSITORY_PORT,         useClass: PrismaOrdersRepository },
    { provide: TABLE_REPOSITORY_PORT,          useClass: PrismaTableRepository },
    { provide: CASH_REPOSITORY_PORT,           useClass: PrismaCashRepository },
    { provide: VOUCHER_REPOSITORY_PORT,        useClass: PrismaVoucherRepository },
    { provide: PRINTER_REPOSITORY_PORT,        useClass: PrismaPrinterRepository },
    { provide: PRINT_TEMPLATE_REPOSITORY_PORT, useClass: PrismaPrintTemplateRepository },
    { provide: REASONS_REPOSITORY_PORT,        useClass: PrismaReasonsRepository },

    // Publisher and API Client Port → Adapter bindings
    { provide: COMANDA_EVENT_PUBLISHER_PORT,   useClass: NatsComandaPublisher },
    { provide: ESC_POS_CLIENT_PORT,            useClass: TcpEscPosClient },
  ],
  exports: [
    MenuService,
    OptionGroupsService,
    OrdersService,
    TablesService,
    CashService,
    VouchersService,
    PrintingService,
    PrintTemplatesService,
    ReasonsService,
  ],
})
export class PontoDeVendaModule {}
