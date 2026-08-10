import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getMenu, setMenu } from '../cache';
import { fetchMenu } from '../local-api';

async function resolveMenu() {
  let menu = await getMenu();
  if (!menu) {
    console.log('[routes/menu] Cache miss — fetching from local backend');
    const fresh = await fetchMenu();
    await setMenu(fresh);
    menu = fresh;
  }
  return menu;
}

export async function menuRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/menu', async (_req: FastifyRequest, reply: FastifyReply) => {
    try {
      const menu = await resolveMenu();
      return reply.send(menu);
    } catch (err) {
      app.log.error(err, '[routes/menu] GET /api/menu failed');
      return reply.status(503).send({
        error: 'Service unavailable',
        message: 'Could not retrieve menu. Please try again shortly.',
      });
    }
  });

  app.get('/api/menu/categories', async (_req: FastifyRequest, reply: FastifyReply) => {
    try {
      const menu = await resolveMenu();
      return reply.send(menu.categories);
    } catch (err) {
      app.log.error(err, '[routes/menu] GET /api/menu/categories failed');
      return reply.status(503).send({
        error: 'Service unavailable',
        message: 'Could not retrieve categories. Please try again shortly.',
      });
    }
  });
}
