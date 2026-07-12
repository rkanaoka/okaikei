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
var SyncWorker_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncWorker = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const redis_service_1 = require("../../common/redis/redis.service");
const events_gateway_1 = require("../../gateway/events.gateway");
const sync_service_1 = require("./sync.service");
const axios_1 = require("axios");
const BATCH_SIZE = 50;
const MAX_ATTEMPTS = 10;
const RETRY_DELAYS_MS = [
    5_000, 15_000, 30_000, 60_000,
    120_000, 300_000, 600_000, 1_200_000, 1_800_000, 3_600_000,
];
let SyncWorker = SyncWorker_1 = class SyncWorker {
    constructor(prisma, redis, gateway, sync) {
        this.prisma = prisma;
        this.redis = redis;
        this.gateway = gateway;
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
        if (!cloudUrl) {
            return;
        }
        this.processing = true;
        try {
            await this.sync.requeueFailed();
            const events = await this.prisma.syncQueue.findMany({
                where: {
                    status: 'PENDING',
                    nextRetry: { lte: new Date() },
                },
                orderBy: { createdAt: 'asc' },
                take: BATCH_SIZE,
            });
            if (!events.length)
                return;
            this.logger.debug(`Processing ${events.length} sync events`);
            await this.prisma.syncQueue.updateMany({
                where: { id: { in: events.map((e) => e.id) } },
                data: { status: 'IN_PROGRESS', lastAttempt: new Date() },
            });
            const online = await this.sendBatch(cloudUrl, events);
            await this.redis.setCloudStatus(online);
            if (online) {
                await this.prisma.syncQueue.updateMany({
                    where: { id: { in: events.map((e) => e.id) } },
                    data: { status: 'SYNCED', syncedAt: new Date() },
                });
                this.logger.log(`Synced ${events.length} events to cloud`);
            }
            else {
                for (const event of events) {
                    const attempts = event.attempts + 1;
                    const delayMs = RETRY_DELAYS_MS[Math.min(attempts - 1, RETRY_DELAYS_MS.length - 1)];
                    const nextRetry = new Date(Date.now() + delayMs);
                    const status = attempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING';
                    await this.prisma.syncQueue.update({
                        where: { id: event.id },
                        data: {
                            status,
                            attempts,
                            nextRetry,
                            errorMessage: 'Cloud API unreachable',
                        },
                    });
                }
                this.logger.warn(`Cloud unreachable — ${events.length} events re-queued`);
            }
            const status = await this.sync.getStatus();
            this.gateway.emitSyncStatus({ online, pendingCount: status.pending, lastSync: status.lastSync });
        }
        catch (err) {
            this.logger.error(`SyncWorker error: ${err.message}`);
        }
        finally {
            this.processing = false;
        }
    }
    async sendBatch(url, events) {
        try {
            const response = await axios_1.default.post(`${url}/ingest`, { events: events.map((e) => ({ id: e.id, type: e.eventType, entity: e.entityType, entityId: e.entityId, payload: e.payload, createdAt: e.createdAt })) }, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Api-Key': process.env.CLOUD_API_KEY ?? '',
                    'X-Restaurant': 'bodogami-sp',
                },
                timeout: 8000,
            });
            return response.status >= 200 && response.status < 300;
        }
        catch {
            return false;
        }
    }
    async checkConnectivity() {
        const cloudUrl = process.env.CLOUD_API_URL;
        if (!cloudUrl)
            return;
        try {
            await axios_1.default.get(`${cloudUrl}/health`, { timeout: 3000 });
            await this.redis.setCloudStatus(true);
        }
        catch {
            await this.redis.setCloudStatus(false);
        }
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
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService,
        events_gateway_1.EventsGateway,
        sync_service_1.SyncService])
], SyncWorker);
//# sourceMappingURL=sync.worker.js.map