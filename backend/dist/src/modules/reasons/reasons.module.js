"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReasonsModule = void 0;
const common_1 = require("@nestjs/common");
const reasons_controller_1 = require("../../runtimes/api/controllers/reasons.controller");
const reasons_service_1 = require("./application/use-cases/reasons.service");
const reasons_repository_port_1 = require("./domain/repositories/reasons-repository.port");
const prisma_reasons_repository_1 = require("./infrastructure/repositories/prisma-reasons.repository");
let ReasonsModule = class ReasonsModule {
};
exports.ReasonsModule = ReasonsModule;
exports.ReasonsModule = ReasonsModule = __decorate([
    (0, common_1.Module)({
        controllers: [reasons_controller_1.ReasonsController],
        providers: [
            reasons_service_1.ReasonsService,
            { provide: reasons_repository_port_1.REASONS_REPOSITORY_PORT, useClass: prisma_reasons_repository_1.PrismaReasonsRepository },
        ],
    })
], ReasonsModule);
//# sourceMappingURL=reasons.module.js.map