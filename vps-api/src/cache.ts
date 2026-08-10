import Redis from 'ioredis';
import { config } from './config';

const MENU_CACHE_KEY = 'bodogami:menu';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(config.redisUrl, {
      password: config.redisPassword || undefined,
      lazyConnect: true,
    });

    redisClient.on('error', (err) => {
      console.error('[cache] Redis error:', err.message);
    });

    redisClient.on('connect', () => {
      console.log('[cache] Connected to Redis');
    });
  }
  return redisClient;
}

export interface MenuItem {
  id: number | string;
  name: string;
  price: number;
  categoryId: number | string;
  description?: string;
  available?: boolean;
  [key: string]: unknown;
}

export interface MenuCategory {
  id: number | string;
  name: string;
  [key: string]: unknown;
}

export interface MenuData {
  categories: MenuCategory[];
  items: MenuItem[];
}

export async function getMenu(): Promise<MenuData | null> {
  const client = getRedisClient();
  try {
    const raw = await client.get(MENU_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MenuData;
  } catch (err) {
    console.error('[cache] getMenu error:', (err as Error).message);
    return null;
  }
}

export async function setMenu(data: MenuData): Promise<void> {
  const client = getRedisClient();
  try {
    await client.set(MENU_CACHE_KEY, JSON.stringify(data), 'EX', config.cacheTtlSeconds);
  } catch (err) {
    console.error('[cache] setMenu error:', (err as Error).message);
  }
}

export async function invalidate(): Promise<void> {
  const client = getRedisClient();
  try {
    await client.del(MENU_CACHE_KEY);
    console.log('[cache] Menu cache invalidated');
  } catch (err) {
    console.error('[cache] invalidate error:', (err as Error).message);
  }
}
