import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { config } from './config';
import { getRedisClient } from './cache';
import { startSyncInterval } from './sync';
import { menuRoutes } from './routes/menu';
import { pedidosRoutes } from './routes/pedidos';
import { internalRoutes } from './routes/internal';

async function bootstrap() {
  const app = Fastify({ logger: true });

  // CORS — open for the public cardapio-app
  await app.register(cors, { origin: '*' });

  // Rate limiting — applied only to /api/* routes
  await app.register(rateLimit, {
    global: false,
    max: 30,
    timeWindow: '1 minute',
    keyGenerator: (req) => req.ip,
    errorResponseBuilder: (_req, context) => ({
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Try again in ${Math.ceil(context.ttl / 1000)}s.`,
      statusCode: 429,
    }),
  });

  // Public routes with rate limiting
  await app.register(async (publicScope) => {
    publicScope.addHook('onRoute', (routeOptions) => {
      // Apply rate limit config to every route registered in this scope
      routeOptions.config = {
        ...(routeOptions.config ?? {}),
        rateLimit: {
          max: 30,
          timeWindow: '1 minute',
        },
      };
    });

    await publicScope.register(menuRoutes);
    await publicScope.register(pedidosRoutes);
  });

  // Private internal routes — no rate limiting
  await app.register(internalRoutes);

  // Health check
  app.get('/health', async (_req, reply) => {
    return reply.send({ status: 'ok', ts: new Date().toISOString() });
  });

  // Connect Redis eagerly so errors surface at startup
  try {
    await getRedisClient().connect();
  } catch (err) {
    app.log.warn({ err }, 'Redis connect failed at startup — will retry on first use');
  }

  // Start periodic menu sync
  startSyncInterval();

  // Start server
  await app.listen({ port: config.port, host: '0.0.0.0' });
  app.log.info(`Bodogami VPS API listening on port ${config.port}`);
}

bootstrap().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
