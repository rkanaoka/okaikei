"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const schedule_1 = require("@nestjs/schedule");
const prisma_module_1 = require("./common/prisma/prisma.module");
const redis_module_1 = require("./common/redis/redis.module");
const nats_module_1 = require("./common/nats/nats.module");
const gateway_module_1 = require("./gateway/gateway.module");
const menu_module_1 = require("./modules/menu/menu.module");
const tables_module_1 = require("./modules/tables/tables.module");
const orders_module_1 = require("./modules/orders/orders.module");
const payments_module_1 = require("./modules/payments/payments.module");
const printing_module_1 = require("./modules/printing/printing.module");
const sync_module_1 = require("./modules/sync/sync.module");
const config_module_1 = require("./modules/config/config.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
            schedule_1.ScheduleModule.forRoot(),
            prisma_module_1.PrismaModule,
            redis_module_1.RedisModule,
            nats_module_1.NatsModule,
            gateway_module_1.GatewayModule,
            menu_module_1.MenuModule,
            tables_module_1.TablesModule,
            orders_module_1.OrdersModule,
            payments_module_1.PaymentsModule,
            printing_module_1.PrintingModule,
            sync_module_1.SyncModule,
            config_module_1.ConfigsModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map