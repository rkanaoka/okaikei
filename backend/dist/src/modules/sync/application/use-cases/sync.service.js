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
var SyncService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncService = void 0;
const common_1 = require("@nestjs/common");
const sync_queue_repository_port_1 = require("../../domain/repositories/sync-queue-repository.port");
const redis_service_1 = require("../../../../shared/infrastructure/cache/redis.service");
const uuidv7_1 = require("uuidv7");
let SyncService = SyncService_1 = class SyncService {
    constructor(repo, redis) {
        this.repo = repo;
        this.redis = redis;
        this.logger = new common_1.Logger(SyncService_1.name);
    }
    async enqueue(eventType, entityType, entityId, payload) {
        try {
            await this.repo.enqueue({
                id: (0, uuidv7_1.uuidv7)(), eventType, entityType, entityId, payload,
                status: 'PENDING',
                nextRetry: new Date(),
            });
        }
        catch (err) {
            this.logger.warn(`SyncQueue enqueue failed (non-critical): ${err.message}`);
        }
    }
    async pendingCount() {
        return this.repo.countByStatus(['PENDING', 'FAILED']);
    }
    async getStatus() {
        const [counts, cloudOnline, lastSynced] = await Promise.all([
            this.repo.countAllStatuses(),
            this.redis.isCloudOnline(),
            this.repo.findLastSynced(),
        ]);
        return { ...counts, cloudOnline, lastSync: lastSynced?.syncedAt ?? null };
    }
    async requeueFailed() {
        const count = await this.repo.requeueExpiredFailed(10);
        if (count > 0)
            this.logger.log(`Re-queued ${count} failed sync events`);
        return count;
    }
};
exports.SyncService = SyncService;
exports.SyncService = SyncService = SyncService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(sync_queue_repository_port_1.SYNC_QUEUE_REPOSITORY_PORT)),
    __metadata("design:paramtypes", [Object, redis_service_1.RedisService])
], SyncService);
//# sourceMappingURL=sync.service.js.map