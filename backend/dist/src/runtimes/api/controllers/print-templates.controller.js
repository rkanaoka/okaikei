"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrintTemplatesController = void 0;
const common_1 = require("@nestjs/common");
const print_templates_service_1 = require("../../../modules/print-templates/application/use-cases/print-templates.service");
const printing_service_1 = require("../../../modules/printing/application/use-cases/printing.service");
let PrintTemplatesController = class PrintTemplatesController {
    constructor(templates, printing) {
        this.templates = templates;
        this.printing = printing;
    }
    list() {
        return this.templates.list();
    }
    get(type) {
        return this.templates.get(type);
    }
    update(type, body) {
        return this.templates.update(type, body);
    }
    reset(type) {
        return this.templates.reset(type);
    }
    async test(type, body) {
        try {
            await this.printing.printTemplateSample(type, body);
            return { ok: true };
        }
        catch (e) {
            return { ok: false, error: e.message };
        }
    }
};
exports.PrintTemplatesController = PrintTemplatesController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PrintTemplatesController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':type'),
    __param(0, (0, common_1.Param)('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PrintTemplatesController.prototype, "get", null);
__decorate([
    (0, common_1.Put)(':type'),
    __param(0, (0, common_1.Param)('type')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], PrintTemplatesController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':type/reset'),
    __param(0, (0, common_1.Param)('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PrintTemplatesController.prototype, "reset", null);
__decorate([
    (0, common_1.Post)(':type/test'),
    __param(0, (0, common_1.Param)('type')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PrintTemplatesController.prototype, "test", null);
exports.PrintTemplatesController = PrintTemplatesController = __decorate([
    (0, common_1.Controller)('print-templates'),
    __metadata("design:paramtypes", [print_templates_service_1.PrintTemplatesService,
        printing_service_1.PrintingService])
], PrintTemplatesController);
//# sourceMappingURL=print-templates.controller.js.map