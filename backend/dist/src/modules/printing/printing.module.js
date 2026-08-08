"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrintingModule = void 0;
const common_1 = require("@nestjs/common");
const printing_service_1 = require("./application/use-cases/printing.service");
const printing_controller_1 = require("../../runtimes/api/controllers/printing.controller");
const print_templates_module_1 = require("../print-templates/print-templates.module");
const printer_repository_port_1 = require("./domain/repositories/printer-repository.port");
const prisma_printer_repository_1 = require("./infrastructure/repositories/prisma-printer.repository");
const esc_pos_client_port_1 = require("./application/contracts/esc-pos-client.port");
const tcp_esc_pos_client_1 = require("./infrastructure/api-clients/tcp-esc-pos.client");
let PrintingModule = class PrintingModule {
};
exports.PrintingModule = PrintingModule;
exports.PrintingModule = PrintingModule = __decorate([
    (0, common_1.Module)({
        imports: [print_templates_module_1.PrintTemplatesModule],
        controllers: [printing_controller_1.PrintingController],
        providers: [
            printing_service_1.PrintingService,
            { provide: printer_repository_port_1.PRINTER_REPOSITORY_PORT, useClass: prisma_printer_repository_1.PrismaPrinterRepository },
            { provide: esc_pos_client_port_1.ESC_POS_CLIENT_PORT, useClass: tcp_esc_pos_client_1.TcpEscPosClient },
        ],
        exports: [printing_service_1.PrintingService],
    })
], PrintingModule);
//# sourceMappingURL=printing.module.js.map