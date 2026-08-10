# CLAUDE.md — vps-api

## Responsabilidade
Gateway público Fastify que roda na VPS do Bodogami.
- Serve o cardápio digital (produtos, categorias, preços) a partir de um cache Redis.
- Encaminha pedidos ao backend local (NestJS) via WireGuard VPN.
- Protege o backend local com uma API key compartilhada.
- Aplica rate limiting nas rotas públicas.

## Variáveis de ambiente

| Variável              | Default                      | Descrição                                    |
|-----------------------|------------------------------|----------------------------------------------|
| `PORT`                | `4000`                       | Porta de escuta do servidor Fastify           |
| `REDIS_URL`           | `redis://redis:6379`         | URL de conexão Redis                          |
| `REDIS_PASSWORD`      | *(vazio)*                    | Senha do Redis                                |
| `LOCAL_BACKEND_URL`   | `http://10.0.0.1:3000`       | IP WireGuard do servidor local                |
| `LOCAL_API_KEY`       | `changeme_super_secret`      | Chave compartilhada VPS ↔ backend local       |
| `CACHE_TTL_SECONDS`   | `300`                        | TTL do cache Redis em segundos (5 min)        |

## Endpoints públicos (rate-limited: 30 req/min por IP)

| Método | Rota                        | Descrição                                            |
|--------|-----------------------------|------------------------------------------------------|
| GET    | `/api/menu`                 | Cardápio completo `{ categories, items }`            |
| GET    | `/api/menu/categories`      | Só as categorias                                     |
| POST   | `/api/pedidos`              | Cria pedido; body: `{ customerName, tableNumber, items }` |
| GET    | `/api/pedidos/:token`       | Status da comanda                                    |
| POST   | `/api/pedidos/:token/items` | Adiciona itens a uma comanda existente               |

## Endpoints privados (header `x-cache-key: LOCAL_API_KEY`)

| Método | Rota                      | Descrição                                            |
|--------|---------------------------|------------------------------------------------------|
| POST   | `/internal/cache/refresh` | Força atualização imediata do cache de menu          |

## Endpoints do backend local chamados pela VPS

Todas as chamadas enviam `x-api-key: LOCAL_API_KEY`.

| Método | Caminho                                  | Descrição              |
|--------|------------------------------------------|------------------------|
| GET    | `{LOCAL_BACKEND_URL}/cardapio/menu`      | Busca cardápio         |
| POST   | `{LOCAL_BACKEND_URL}/cardapio/pedido`    | Cria pedido            |
| GET    | `{LOCAL_BACKEND_URL}/cardapio/comanda/:token`        | Consulta comanda       |
| POST   | `{LOCAL_BACKEND_URL}/cardapio/comanda/:token/items`  | Adiciona itens         |

## Fluxo de cache

```
Início              → fetchAndCacheMenu() (uma vez imediata)
A cada TTL segundos → fetchAndCacheMenu() (setInterval)
GET /api/menu       → cache hit → retorna Redis
                    → cache miss → busca backend local → salva Redis → retorna
POST /internal/cache/refresh → invalida + rebusca imediatamente
```

## Estrutura de arquivos

```
vps-api/
  src/
    config.ts          # Lê variáveis de ambiente com defaults
    cache.ts           # Cliente Redis (ioredis) — getMenu / setMenu / invalidate
    sync.ts            # fetchAndCacheMenu + startSyncInterval
    local-api.ts       # Cliente axios → backend local
    routes/
      menu.ts          # GET /api/menu, GET /api/menu/categories
      pedidos.ts       # POST/GET /api/pedidos, POST /api/pedidos/:token/items
      internal.ts      # POST /internal/cache/refresh
    index.ts           # Bootstrap Fastify + registro de plugins + listen
  Dockerfile           # Multi-stage build Node 20 Alpine
  package.json
  tsconfig.json
```

## Como rodar localmente

```bash
cd vps-api
npm install
# Copie e ajuste as envs
cp ../.env.vps.example .env
# Desenvolvimento (com hot reload)
npm run dev
# Build de produção
npm run build && npm start
```
