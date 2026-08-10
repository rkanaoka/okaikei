export const config = {
  port: parseInt(process.env.PORT ?? '4000', 10),
  redisUrl: process.env.REDIS_URL ?? 'redis://redis:6379',
  redisPassword: process.env.REDIS_PASSWORD ?? '',
  localBackendUrl: process.env.LOCAL_BACKEND_URL ?? 'http://10.0.0.1:3000',
  localApiKey: process.env.LOCAL_API_KEY ?? 'changeme_super_secret',
  cacheTtlSeconds: parseInt(process.env.CACHE_TTL_SECONDS ?? '300', 10),
};
