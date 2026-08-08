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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaSyncQueueRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../../shared/infrastructure/database/prisma.service");
let PrismaSyncQueueRepository = class PrismaSyncQueueRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async enqueue(data) {
        await this.prisma.syncQueue.create({ data: data });
    }
    async countByStatus(statuses) {
        return this.prisma.syncQueue.count({ where: { status: { in: statuses } } });
    }
    async countAllStatuses() {
        const [pending, failed, synced] = await Promise.all([
            this.prisma.syncQueue.count({ where: { status: 'PENDING' } }),
            this.prisma.syncQueue.count({ where: { status: 'FAILED' } }),
            this.prisma.syncQueue.count({ where: { status: 'SYNCED' } }),
        ]);
        return { pending, failed, synced };
    }
    async findLastSynced() {
        return this.prisma.syncQueue.findFirst({
            where: { status: 'SYNCED' },
            orderBy: { syncedAt: 'desc' },
            select: { syncedAt: true },
        });
    }
    async requeueExpiredFailed(maxAttempts) {
        const result = await this.prisma.syncQueue.updateMany({
            where: {
                status: 'FAILED',
                attempts: { lt: maxAttempts },
                nextRetry: { lte: new Date() },
            },
            data: { status: 'PENDING' },
        });
        return result.count;
    }
    async findPendingBatch(limit) {
        return this.prisma.syncQueue.findMany({
            where: { status: 'PENDING', nextRetry: { lte: new Date() } },
            orderBy: { createdAt: 'asc' },
            take: limit,
        });
    }
    async markInProgress(ids) {
        await this.prisma.syncQueue.updateMany({
            where: { id: { in: ids } },
            data: { status: 'IN_PROGRESS', lastAttempt: new Date() },
        });
    }
    async markSynced(ids) {
        await this.prisma.syncQueue.updateMany({
            where: { id: { in: ids } },
            data: { status: 'SYNCED', syncedAt: new Date() },
        });
    }
    async markFailed(event, errorMessage, maxAttempts, retryDelaysMs) {
        const attempts = event.attempts + 1;
        const delayMs = retryDelaysMs[Math.min(attempts - 1, retryDelaysMs.length - 1)];
        const nextRetry = new Date(Date.now() + delayMs);
        const status = attempts >= maxAttempts ? 'FAILED' : 'PENDING';
        await this.prisma.syncQueue.update({
            where: { id: event.id },
            data: { status, attempts, nextRetry, errorMessage },
        });
    }
};
exports.PrismaSyncQueueRepository = PrismaSyncQueueRepository;
exports.PrismaSyncQueueRepository = PrismaSyncQueueRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PrismaSyncQueueRepository);
//# sourceMappingURL=prisma-sync-queue.repository.js.map