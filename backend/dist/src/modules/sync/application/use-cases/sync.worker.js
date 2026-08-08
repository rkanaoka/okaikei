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
var SyncWorker_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncWorker = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const sync_queue_repository_port_1 = require("../../domain/repositories/sync-queue-repository.port");
const cloud_sync_api_client_port_1 = require("../contracts/cloud-sync-api-client.port");
const websocket_publisher_port_1 = require("../../../../shared/application/contracts/websocket-publisher.port");
const redis_service_1 = require("../../../../shared/infrastructure/cache/redis.service");
const sync_service_1 = require("./sync.service");
const BATCH_SIZE = 50;
const MAX_ATTEMPTS = 10;
const RETRY_DELAYS_MS = [
    5_000, 15_000, 30_000, 60_000,
    120_000, 300_000, 600_000, 1_200_000, 1_800_000, 3_600_000,
];
let SyncWorker = SyncWorker_1 = class SyncWorker {
    constructor(repo, cloudApi, wsPublisher, redis, sync) {
        this.repo = repo;
        this.cloudApi = cloudApi;
        this.wsPublisher = wsPublisher;
        this.redis = redis;
        this.sync = sync;
        this.logger = new common_1.Logger(SyncWorker_1.name);
        this.processing = false;
    }
    onModuleInit() {
        setTimeout(() => this.process(), 5000);
    }
    async process() {
        if (this.processing)
            return;
        const cloudUrl = process.env.CLOUD_API_URL;
        if (!cloudUrl)
            return;
        this.processing = true;
        try {
            await this.sync.requeueFailed();
            const events = await this.repo.findPendingBatch(BATCH_SIZE);
            if (!events.length)
                return;
            this.logger.debug(`Processing ${events.length} sync events`);
            await this.repo.markInProgress(events.map((e) => e.id));
            const online = await this.cloudApi.sendBatch(cloudUrl, events);
            await this.redis.setCloudStatus(online);
            if (online) {
                await this.repo.markSynced(events.map((e) => e.id));
                this.logger.log(`Synced ${events.length} events to cloud`);
            }
            else {
                for (const event of events) {
                    await this.repo.markFailed(event, 'Cloud API unreachable', MAX_ATTEMPTS, RETRY_DELAYS_MS);
                }
                this.logger.warn(`Cloud unreachable — ${events.length} events re-queued`);
            }
            const status = await this.sync.getStatus();
            this.wsPublisher.emitSyncStatus({ online, pendingCount: status.pending, lastSync: status.lastSync });
        }
        catch (err) {
            this.logger.error(`SyncWorker error: ${err.message}`);
        }
        finally {
            this.processing = false;
        }
    }
    async checkConnectivity() {
        const cloudUrl = process.env.CLOUD_API_URL;
        if (!cloudUrl)
            return;
        const online = await this.cloudApi.checkHealth(cloudUrl);
        await this.redis.setCloudStatus(online);
    }
};
exports.SyncWorker = SyncWorker;
__decorate([
    (0, schedule_1.Cron)('*/10 * * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SyncWorker.prototype, "process", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_MINUTE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SyncWorker.prototype, "checkConnectivity", null);
exports.SyncWorker = SyncWorker = SyncWorker_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(sync_queue_repository_port_1.SYNC_QUEUE_REPOSITORY_PORT)),
    __param(1, (0, common_1.Inject)(cloud_sync_api_client_port_1.CLOUD_SYNC_API_CLIENT_PORT)),
    __param(2, (0, common_1.Inject)(websocket_publisher_port_1.WEBSOCKET_PUBLISHER_PORT)),
    __metadata("design:paramtypes", [Object, Object, Object, redis_service_1.RedisService,
        sync_service_1.SyncService])
], SyncWorker);
//# sourceMappingURL=sync.worker.js.map