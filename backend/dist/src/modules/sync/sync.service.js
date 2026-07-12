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
var SyncService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const redis_service_1 = require("../../common/redis/redis.service");
const uuidv7_1 = require("uuidv7");
let SyncService = SyncService_1 = class SyncService {
    constructor(prisma, redis) {
        this.prisma = prisma;
        this.redis = redis;
        this.logger = new common_1.Logger(SyncService_1.name);
    }
    async enqueue(eventType, entityType, entityId, payload) {
        try {
            await this.prisma.syncQueue.create({
                data: {
                    id: (0, uuidv7_1.uuidv7)(),
                    eventType,
                    entityType,
                    entityId,
                    payload,
                    status: 'PENDING',
                    nextRetry: new Date(),
                },
            });
        }
        catch (err) {
            this.logger.warn(`SyncQueue enqueue failed (non-critical): ${err.message}`);
        }
    }
    async pendingCount() {
        return this.prisma.syncQueue.count({
            where: { status: { in: ['PENDING', 'FAILED'] } },
        });
    }
    async getStatus() {
        const [pending, failed, synced, cloudOnline] = await Promise.all([
            this.prisma.syncQueue.count({ where: { status: 'PENDING' } }),
            this.prisma.syncQueue.count({ where: { status: 'FAILED' } }),
            this.prisma.syncQueue.count({ where: { status: 'SYNCED' } }),
            this.redis.isCloudOnline(),
        ]);
        const lastSynced = await this.prisma.syncQueue.findFirst({
            where: { status: 'SYNCED' },
            orderBy: { syncedAt: 'desc' },
            select: { syncedAt: true },
        });
        return { pending, failed, synced, cloudOnline, lastSync: lastSynced?.syncedAt ?? null };
    }
    async requeueFailed() {
        const result = await this.prisma.syncQueue.updateMany({
            where: {
                status: 'FAILED',
                attempts: { lt: 10 },
                nextRetry: { lte: new Date() },
            },
            data: { status: 'PENDING' },
        });
        if (result.count > 0) {
            this.logger.log(`Re-queued ${result.count} failed sync events`);
        }
        return result.count;
    }
};
exports.SyncService = SyncService;
exports.SyncService = SyncService = SyncService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService])
], SyncService);
//# sourceMappingURL=sync.service.js.map