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
exports.ReasonsController = void 0;
const common_1 = require("@nestjs/common");
const reasons_service_1 = require("../../../modules/reasons/application/use-cases/reasons.service");
let ReasonsController = class ReasonsController {
    constructor(reasons) {
        this.reasons = reasons;
    }
    listCancellation() {
        return this.reasons.listCancellationReasons();
    }
    createCancellation(body) {
        return this.reasons.createCancellationReason(body);
    }
    cancellationHistory() {
        return this.reasons.listCancellationHistory();
    }
    listDiscount() {
        return this.reasons.listDiscountReasons();
    }
    createDiscount(body) {
        return this.reasons.createDiscountReason(body);
    }
};
exports.ReasonsController = ReasonsController;
__decorate([
    (0, common_1.Get)('cancellation'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ReasonsController.prototype, "listCancellation", null);
__decorate([
    (0, common_1.Post)('cancellation'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ReasonsController.prototype, "createCancellation", null);
__decorate([
    (0, common_1.Get)('cancellation/history'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ReasonsController.prototype, "cancellationHistory", null);
__decorate([
    (0, common_1.Get)('discount'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ReasonsController.prototype, "listDiscount", null);
__decorate([
    (0, common_1.Post)('discount'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ReasonsController.prototype, "createDiscount", null);
exports.ReasonsController = ReasonsController = __decorate([
    (0, common_1.Controller)('reasons'),
    __metadata("design:paramtypes", [reasons_service_1.ReasonsService])
], ReasonsController);
//# sourceMappingURL=reasons.controller.js.map