"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var RedisService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = require("ioredis");
const TTL = {
    MENU: 60 * 5,
    TABLES: 30,
    SESSION: 60 * 60 * 8,
    CONFIG: 60 * 60,
};
let RedisService = RedisService_1 = class RedisService {
    constructor() {
        this.logger = new common_1.Logger(RedisService_1.name);
    }
    onModuleInit() {
        this.client = new ioredis_1.default(process.env.REDIS_URL, {
            retryStrategy: (times) => Math.min(times * 200, 5000),
            enableReadyCheck: true,
            maxRetriesPerRequest: 3,
        });
        this.client.on('connect', () => this.logger.log('Redis connected'));
        this.client.on('error', (err) => this.logger.error('Redis error', err.message));
    }
    async onModuleDestroy() {
        await this.client?.quit();
    }
    async get(key) {
        const raw = await this.client.get(key);
        if (!raw)
            return null;
        try {
            return JSON.parse(raw);
        }
        catch {
            return raw;
        }
    }
    async set(key, value, ttl) {
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);
        if (ttl)
            await this.client.setex(key, ttl, serialized);
        else
            await this.client.set(key, serialized);
    }
    async del(key) {
        await this.client.del(key);
    }
    async invalidatePattern(pattern) {
        const keys = await this.client.keys(pattern);
        if (keys.length > 0)
            await this.client.del(...keys);
    }
    cacheMenu(items) {
        return this.set('menu:all', items, TTL.MENU);
    }
    getMenu() {
        return this.get('menu:all');
    }
    cacheTables(tables) {
        return this.set('tables:active', tables, TTL.TABLES);
    }
    getTables() {
        return this.get('tables:active');
    }
    invalidateMenu() {
        return this.del('menu:all');
    }
    invalidateTables() {
        return this.del('tables:active');
    }
    async setCloudStatus(online) {
        await this.set('cloud:online', online, 60);
    }
    async isCloudOnline() {
        const v = await this.get('cloud:online');
        return v ?? false;
    }
};
exports.RedisService = RedisService;
exports.RedisService = RedisService = RedisService_1 = __decorate([
    (0, common_1.Injectable)()
], RedisService);
//# sourceMappingURL=redis.service.js.map