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
exports.SyncController = void 0;
const common_1 = require("@nestjs/common");
const sync_service_1 = require("../../../modules/sync/application/use-cases/sync.service");
const sync_worker_1 = require("../../../modules/sync/application/use-cases/sync.worker");
let SyncController = class SyncController {
    constructor(sync, worker) {
        this.sync = sync;
        this.worker = worker;
    }
    status() {
        return this.sync.getStatus();
    }
    async flush() {
        await this.worker.process();
        return { ok: true };
    }
    receive() {
        return { ok: true, message: 'Received' };
    }
    async queue(page = '1') {
        const skip = (parseInt(page) - 1) * 50;
        const [items, total] = await Promise.all([
            this.sync.pendingCount(),
            this.sync.getStatus(),
        ]);
        return { total, status: total };
    }
};
exports.SyncController = SyncController;
__decorate([
    (0, common_1.Get)('status'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SyncController.prototype, "status", null);
__decorate([
    (0, common_1.Post)('flush'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SyncController.prototype, "flush", null);
__decorate([
    (0, common_1.Post)('receive'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SyncController.prototype, "receive", null);
__decorate([
    (0, common_1.Get)('queue'),
    __param(0, (0, common_1.Query)('page')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SyncController.prototype, "queue", null);
exports.SyncController = SyncController = __decorate([
    (0, common_1.Controller)('sync'),
    __metadata("design:paramtypes", [sync_service_1.SyncService,
        sync_worker_1.SyncWorker])
], SyncController);
//# sourceMappingURL=sync.controller.js.map