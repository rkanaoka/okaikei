"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrintTemplatesModule = void 0;
const common_1 = require("@nestjs/common");
const print_templates_controller_1 = require("../../runtimes/api/controllers/print-templates.controller");
const print_templates_service_1 = require("./application/use-cases/print-templates.service");
const print_template_repository_port_1 = require("./domain/repositories/print-template-repository.port");
const prisma_print_template_repository_1 = require("./infrastructure/repositories/prisma-print-template.repository");
let PrintTemplatesModule = class PrintTemplatesModule {
};
exports.PrintTemplatesModule = PrintTemplatesModule;
exports.PrintTemplatesModule = PrintTemplatesModule = __decorate([
    (0, common_1.Module)({
        controllers: [print_templates_controller_1.PrintTemplatesController],
        providers: [
            print_templates_service_1.PrintTemplatesService,
            { provide: print_template_repository_port_1.PRINT_TEMPLATE_REPOSITORY_PORT, useClass: prisma_print_template_repository_1.PrismaPrintTemplateRepository },
        ],
        exports: [print_templates_service_1.PrintTemplatesService],
    })
], PrintTemplatesModule);
//# sourceMappingURL=print-templates.module.js.map