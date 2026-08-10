import { config } from './config';
import { setMenu } from './cache';
import { fetchMenu } from './local-api';

export async function fetchAndCacheMenu(): Promise<void> {
  try {
    console.log('[sync] Fetching menu from local backend...');
    const menu = await fetchMenu();
    await setMenu(menu);
    console.log(
      `[sync] Menu cached — ${menu.categories?.length ?? 0} categories, ${menu.items?.length ?? 0} items`
    );
  } catch (err) {
    console.error('[sync] Failed to fetch/cache menu:', (err as Error).message);
  }
}

export function startSyncInterval(): void {
  fetchAndCacheMenu().catch(() => {
    // error already logged inside fetchAndCacheMenu
  });

  const intervalMs = config.cacheTtlSeconds * 1000;
  setInterval(() => {
    fetchAndCacheMenu().catch(() => {
      // error already logged inside fetchAndCacheMenu
    });
  }, intervalMs);

  console.log(`[sync] Interval started — refreshing every ${config.cacheTtlSeconds}s`);
}
