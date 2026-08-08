"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MenuModule = void 0;
const common_1 = require("@nestjs/common");
const menu_controller_1 = require("../../runtimes/api/controllers/menu.controller");
const menu_service_1 = require("./application/use-cases/menu.service");
const sync_module_1 = require("../sync/sync.module");
const menu_repository_port_1 = require("./domain/repositories/menu-repository.port");
const prisma_menu_repository_1 = require("./infrastructure/repositories/prisma-menu.repository");
let MenuModule = class MenuModule {
};
exports.MenuModule = MenuModule;
exports.MenuModule = MenuModule = __decorate([
    (0, common_1.Module)({
        imports: [sync_module_1.SyncModule],
        controllers: [menu_controller_1.MenuController],
        providers: [
            menu_service_1.MenuService,
            { provide: menu_repository_port_1.MENU_REPOSITORY_PORT, useClass: prisma_menu_repository_1.PrismaMenuRepository },
        ],
        exports: [menu_service_1.MenuService],
    })
], MenuModule);
//# sourceMappingURL=menu.module.js.map