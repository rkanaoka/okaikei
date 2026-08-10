import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { config } from '../config';
import { fetchAndCacheMenu } from '../sync';

export async function internalRoutes(app: FastifyInstance): Promise<void> {
  app.post('/internal/cache/refresh', async (req: FastifyRequest, reply: FastifyReply) => {
    const cacheKey = req.headers['x-cache-key'];

    if (!cacheKey || cacheKey !== config.localApiKey) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid or missing x-cache-key header.' });
    }

    try {
      await fetchAndCacheMenu();
      return reply.send({ ok: true, message: 'Menu cache refreshed successfully.' });
    } catch (err) {
      app.log.error(err, '[routes/internal] POST /internal/cache/refresh failed');
      return reply.status(503).send({
        error: 'Service unavailable',
        message: 'Failed to refresh cache. Check backend connectivity.',
      });
    }
  });
}
