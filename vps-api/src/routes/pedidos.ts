import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { AxiosError } from 'axios';
import { createPedido, getComanda, addPedidoItems, CreatePedidoBody, AddItemsBody } from '../local-api';

function isAxiosError(err: unknown): err is AxiosError {
  return (err as AxiosError).isAxiosError === true;
}

function handleBackendError(err: unknown, reply: FastifyReply, context: string): FastifyReply {
  if (isAxiosError(err)) {
    const status = err.response?.status;
    if (status === 404) {
      return reply.status(404).send({ error: 'Not found', message: 'Resource not found.' });
    }
    if (status === 422 || status === 400) {
      return reply.status(422).send({
        error: 'Validation error',
        message: (err.response?.data as { message?: string })?.message ?? 'Invalid request.',
      });
    }
  }
  console.error(`[routes/pedidos] ${context}:`, (err as Error).message);
  return reply.status(503).send({
    error: 'Service unavailable',
    message: 'Could not reach local backend. Please try again shortly.',
  });
}

interface CreatePedidoRequestBody {
  customerName?: unknown;
  tableNumber?: unknown;
  items?: unknown;
}

interface AddItemsRequestBody {
  items?: unknown;
}

interface TokenParams {
  token: string;
}

export async function pedidosRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/pedidos
  app.post(
    '/api/pedidos',
    async (req: FastifyRequest<{ Body: CreatePedidoRequestBody }>, reply: FastifyReply) => {
      const { customerName, tableNumber, items } = req.body ?? {};

      if (!customerName || typeof customerName !== 'string' || customerName.trim() === '') {
        return reply.status(422).send({ error: 'Validation error', message: '`customerName` é obrigatório.' });
      }
      if (tableNumber === undefined || tableNumber === null || tableNumber === '') {
        return reply.status(422).send({ error: 'Validation error', message: '`tableNumber` é obrigatório.' });
      }
      if (!Array.isArray(items) || items.length === 0) {
        return reply.status(422).send({ error: 'Validation error', message: '`items` deve ser um array não vazio.' });
      }

      for (const item of items) {
        if (!item || typeof item !== 'object') {
          return reply.status(422).send({ error: 'Validation error', message: 'Cada item deve ser um objeto.' });
        }
        const { menuItemId, qty } = item as Record<string, unknown>;
        if (menuItemId === undefined || menuItemId === null) {
          return reply.status(422).send({ error: 'Validation error', message: 'Cada item precisa de `menuItemId`.' });
        }
        if (typeof qty !== 'number' || !Number.isInteger(qty) || qty < 1) {
          return reply.status(422).send({ error: 'Validation error', message: 'Cada item precisa de `qty` inteiro positivo.' });
        }
      }

      try {
        const result = await createPedido(req.body as CreatePedidoBody);
        return reply.status(201).send(result);
      } catch (err) {
        return handleBackendError(err, reply, 'POST /api/pedidos');
      }
    }
  );

  // GET /api/pedidos/:token
  app.get(
    '/api/pedidos/:token',
    async (req: FastifyRequest<{ Params: TokenParams }>, reply: FastifyReply) => {
      const { token } = req.params;
      try {
        const comanda = await getComanda(token);
        return reply.send(comanda);
      } catch (err) {
        return handleBackendError(err, reply, `GET /api/pedidos/${token}`);
      }
    }
  );

  // POST /api/pedidos/:token/items
  app.post(
    '/api/pedidos/:token/items',
    async (
      req: FastifyRequest<{ Params: TokenParams; Body: AddItemsRequestBody }>,
      reply: FastifyReply
    ) => {
      const { token } = req.params;
      const { items } = req.body ?? {};

      if (!Array.isArray(items) || items.length === 0) {
        return reply.status(422).send({ error: 'Validation error', message: '`items` deve ser um array não vazio.' });
      }

      for (const item of items) {
        if (!item || typeof item !== 'object') {
          return reply.status(422).send({ error: 'Validation error', message: 'Cada item deve ser um objeto.' });
        }
        const { menuItemId, qty } = item as Record<string, unknown>;
        if (menuItemId === undefined || menuItemId === null) {
          return reply.status(422).send({ error: 'Validation error', message: 'Cada item precisa de `menuItemId`.' });
        }
        if (typeof qty !== 'number' || !Number.isInteger(qty) || qty < 1) {
          return reply.status(422).send({ error: 'Validation error', message: 'Cada item precisa de `qty` inteiro positivo.' });
        }
      }

      try {
        const result = await addPedidoItems(token, req.body as AddItemsBody);
        return reply.send(result);
      } catch (err) {
        return handleBackendError(err, reply, `POST /api/pedidos/${token}/items`);
      }
    }
  );
}
