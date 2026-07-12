import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';

const TTL = {
  MENU:     60 * 5,     // 5 min
  TABLES:   30,         // 30s (mesas abertas mudam rápido)
  SESSION:  60 * 60 * 8,// 8h
  CONFIG:   60 * 60,    // 1h
} as const;

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  onModuleInit() {
    this.client = new Redis(process.env.REDIS_URL, {
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

  // ── Helpers ─────────────────────────────────────────────────────────────────

  async get<T = any>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    if (!raw) return null;
    try { return JSON.parse(raw) as T; } catch { return raw as any; }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttl) await this.client.setex(key, ttl, serialized);
    else     await this.client.set(key, serialized);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) await this.client.del(...keys);
  }

  // ── Cache helpers com TTL semântico ─────────────────────────────────────────

  cacheMenu(items: any[]) {
    return this.set('menu:all', items, TTL.MENU);
  }

  getMenu(): Promise<any[] | null> {
    return this.get('menu:all');
  }

  cacheTables(tables: any[]) {
    return this.set('tables:active', tables, TTL.TABLES);
  }

  getTables(): Promise<any[] | null> {
    return this.get('tables:active');
  }

  invalidateMenu() {
    return this.del('menu:all');
  }

  invalidateTables() {
    return this.del('tables:active');
  }

  // ── Status de conectividade com a nuvem ─────────────────────────────────────

  async setCloudStatus(online: boolean) {
    await this.set('cloud:online', online, 60);
  }

  async isCloudOnline(): Promise<boolean> {
    const v = await this.get<boolean>('cloud:online');
    return v ?? false;
  }
}
