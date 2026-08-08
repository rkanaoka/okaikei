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
exports.OptionGroupsController = void 0;
const common_1 = require("@nestjs/common");
const option_groups_service_1 = require("../../../modules/option-groups/application/use-cases/option-groups.service");
let OptionGroupsController = class OptionGroupsController {
    constructor(groups) {
        this.groups = groups;
    }
    findAll() {
        return this.groups.findAll();
    }
    create(body) {
        return this.groups.create(body);
    }
    updateOption(optionId, body) {
        return this.groups.updateOption(optionId, body);
    }
    findOne(id) {
        return this.groups.findOne(id);
    }
    update(id, body) {
        return this.groups.update(id, body);
    }
    remove(id) {
        return this.groups.remove(id);
    }
    setItems(id, body) {
        return this.groups.setItems(id, body.menuItemIds ?? []);
    }
};
exports.OptionGroupsController = OptionGroupsController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], OptionGroupsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], OptionGroupsController.prototype, "create", null);
__decorate([
    (0, common_1.Put)('options/:optionId'),
    __param(0, (0, common_1.Param)('optionId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], OptionGroupsController.prototype, "updateOption", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OptionGroupsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], OptionGroupsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OptionGroupsController.prototype, "remove", null);
__decorate([
    (0, common_1.Put)(':id/items'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], OptionGroupsController.prototype, "setItems", null);
exports.OptionGroupsController = OptionGroupsController = __decorate([
    (0, common_1.Controller)('option-groups'),
    __metadata("design:paramtypes", [option_groups_service_1.OptionGroupsService])
], OptionGroupsController);
//# sourceMappingURL=option-groups.controller.js.map