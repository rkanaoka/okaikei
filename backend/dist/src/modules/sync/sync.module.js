"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncModule = void 0;
const common_1 = require("@nestjs/common");
const sync_service_1 = require("./application/use-cases/sync.service");
const sync_worker_1 = require("./application/use-cases/sync.worker");
const sync_controller_1 = require("../../runtimes/api/controllers/sync.controller");
const sync_queue_repository_port_1 = require("./domain/repositories/sync-queue-repository.port");
const prisma_sync_queue_repository_1 = require("./infrastructure/repositories/prisma-sync-queue.repository");
const cloud_sync_api_client_port_1 = require("./application/contracts/cloud-sync-api-client.port");
const axios_cloud_sync_client_1 = require("./infrastructure/api-clients/axios-cloud-sync.client");
let SyncModule = class SyncModule {
};
exports.SyncModule = SyncModule;
exports.SyncModule = SyncModule = __decorate([
    (0, common_1.Module)({
        controllers: [sync_controller_1.SyncController],
        providers: [
            sync_service_1.SyncService,
            sync_worker_1.SyncWorker,
            { provide: sync_queue_repository_port_1.SYNC_QUEUE_REPOSITORY_PORT, useClass: prisma_sync_queue_repository_1.PrismaSyncQueueRepository },
            { provide: cloud_sync_api_client_port_1.CLOUD_SYNC_API_CLIENT_PORT, useClass: axios_cloud_sync_client_1.AxiosCloudSyncClient },
        ],
        exports: [sync_service_1.SyncService],
    })
], SyncModule);
//# sourceMappingURL=sync.module.js.map