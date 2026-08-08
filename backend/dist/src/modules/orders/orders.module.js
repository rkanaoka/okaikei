"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersModule = void 0;
const common_1 = require("@nestjs/common");
const orders_controller_1 = require("../../runtimes/api/controllers/orders.controller");
const orders_service_1 = require("./application/use-cases/orders.service");
const sync_module_1 = require("../sync/sync.module");
const printing_module_1 = require("../printing/printing.module");
const orders_repository_port_1 = require("./domain/repositories/orders-repository.port");
const prisma_orders_repository_1 = require("./infrastructure/repositories/prisma-orders.repository");
const comanda_event_publisher_port_1 = require("./application/contracts/comanda-event-publisher.port");
const nats_comanda_publisher_1 = require("./infrastructure/publishers/nats-comanda.publisher");
let OrdersModule = class OrdersModule {
};
exports.OrdersModule = OrdersModule;
exports.OrdersModule = OrdersModule = __decorate([
    (0, common_1.Module)({
        imports: [sync_module_1.SyncModule, printing_module_1.PrintingModule],
        controllers: [orders_controller_1.OrdersController],
        providers: [
            orders_service_1.OrdersService,
            { provide: orders_repository_port_1.ORDERS_REPOSITORY_PORT, useClass: prisma_orders_repository_1.PrismaOrdersRepository },
            { provide: comanda_event_publisher_port_1.COMANDA_EVENT_PUBLISHER_PORT, useClass: nats_comanda_publisher_1.NatsComandaPublisher },
        ],
        exports: [orders_service_1.OrdersService],
    })
], OrdersModule);
//# sourceMappingURL=orders.module.js.map