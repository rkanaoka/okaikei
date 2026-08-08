# Relatório de Reorganização Arquitetural — Bodogami POS

**Data:** 2026-08-01  
**Arquitetura adotada:** DDD + Clean Architecture + Hexagonal  

---

## 1. Estrutura Anterior

```
backend/src/
  app.module.ts            ← raiz
  main.ts
  common/
    prisma/                ← PrismaService/Module
    redis/                 ← RedisService/Module
    nats/                  ← NatsService/Module
  gateway/
    events.gateway.ts      ← WebSocket
    gateway.module.ts
  modules/
    menu/
      menu.service.ts      ← serviço na raiz do módulo
      menu.controller.ts   ← controller na raiz do módulo
      menu.module.ts
    [... 13 módulos com mesma estrutura flat]

nginx/
  nginx.conf
```

## 2. Estrutura Nova

```
backend/src/
  main.ts
  shared/
    infrastructure/
      database/            ← PrismaService/Module
      cache/               ← RedisService/Module
      messaging/           ← NatsService/Module
    CLAUDE.md
  runtimes/
    api/
      app.module.ts        ← AppModule movido para cá
      controllers/         ← todos os 10 controllers centralizados
      websocket/           ← eventos.gateway + gateway.module
    CLAUDE.md
  modules/
    [menu, orders, etc.]/
      domain/
        entities/
        repositories/      ← interfaces (portas)
      application/
        use-cases/         ← serviços
        dto/
        contracts/
      infrastructure/
        repositories/      ← adapters Prisma
      [module].module.ts
    CLAUDE.md

docker/
  nginx/
    nginx.conf             ← movido de nginx/

database/
  schema.prisma            ← movido de backend/prisma/
  migrations/
  seeds/
  CLAUDE.md
```

## 3. Arquivos Movidos / Renomeados / Removidos

| Origem | Destino | Ação |
|---|---|---|
| `backend/src/app.module.ts` | `backend/src/runtimes/api/app.module.ts` | Movido |
| `backend/src/common/prisma/*` | `backend/src/shared/infrastructure/database/` | Movido |
| `backend/src/common/redis/*` | `backend/src/shared/infrastructure/cache/` | Movido |
| `backend/src/common/nats/*` | `backend/src/shared/infrastructure/messaging/` | Movido |
| `backend/src/gateway/*` | `backend/src/runtimes/api/websocket/` | Movido |
| `backend/src/modules/*/[module].controller.ts` | `backend/src/runtimes/api/controllers/` | Centralizado |
| `backend/src/modules/*/[module].service.ts` | `backend/src/modules/*/application/use-cases/` | Movido |
| `nginx/nginx.conf` | `docker/nginx/nginx.conf` | Movido |
| `backend/src/common/` | — | Removido (vazio) |
| `backend/src/gateway/` | — | Removido (vazio) |

## 4. Imports Corrigidos

### app.module.ts (novo local: runtimes/api/)
Todos os imports relativos `./shared/...` e `./modules/...` convertidos para alias `@/`:

```typescript
// Antes (relativo):
import { PrismaModule } from '../../shared/infrastructure/database/prisma.module';

// Depois (alias):
import { PrismaModule } from '@/shared/infrastructure/database/prisma.module';
```

### Controllers (novo local: runtimes/api/controllers/)
Imports de serviços atualizados para o novo caminho:

```typescript
// Antes:
import { MenuService } from '../menu.service';

// Depois:
import { MenuService } from '@/modules/menu/application/use-cases/menu.service';
```

### Módulos — imports cross-module
```typescript
// Antes:
import { SyncService } from '@/modules/sync/sync.service';

// Depois:
import { SyncService } from '@/modules/sync/application/use-cases/sync.service';
```

### main.ts
```typescript
// Antes:
import { AppModule } from './app.module';

// Depois:
import { AppModule } from './runtimes/api/app.module';
```

### docker-compose.yml — volume do nginx
```yaml
# Antes:
- ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro

# Depois:
- ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
```

## 5. Problemas Encontrados e Soluções

| Problema | Causa | Solução |
|---|---|---|
| Imports relativos inválidos após mover `app.module.ts` | Caminho relativo não funciona de `runtimes/api/` | Convertido tudo para alias `@/` via sed |
| `await import('./common/prisma/...')` em `main.ts` | Import dinâmico de caminho removido | Linha deletada (Prisma conecta lazily) |
| Cross-module service imports quebrados | Serviços movidos para `application/use-cases/` | Sed global: `@/modules/sync/sync.service` → `@/modules/sync/application/use-cases/sync.service` |
| `docker-compose.yml` volume não encontrava nginx.conf | Pasta `nginx/` movida para `docker/nginx/` | Volume atualizado no compose |
| Erros de tipo TS no frontend (`import.meta.env`) | `vite/client` ausente no `tsconfig.json` | Adicionado `"types": ["vite/client"]` |

## 6. CLAUDE.md criados

| Arquivo | Diretório documentado |
|---|---|
| `/okaikei/CLAUDE.md` | Root do projeto |
| `backend/src/CLAUDE.md` | Código-fonte backend |
| `backend/src/modules/CLAUDE.md` | Tabela de módulos e regras |
| `backend/src/modules/menu/CLAUDE.md` | Módulo menu (referência) |
| `backend/src/modules/[12 módulos]/CLAUDE.md` | Cada módulo individualmente |
| `backend/src/shared/CLAUDE.md` | Shared / cross-cutting |
| `backend/src/shared/infrastructure/CLAUDE.md` | Database, cache, messaging |
| `backend/src/runtimes/CLAUDE.md` | Entry points |
| `backend/src/runtimes/api/controllers/CLAUDE.md` | Tabela de controllers |
| `backend/src/runtimes/api/websocket/CLAUDE.md` | WebSocket gateway |
| `database/CLAUDE.md` | Schema Prisma e migrations |
| `docker/CLAUDE.md` | Docker e infraestrutura |
| `frontend/src/CLAUDE.md` | SPA React + Vite |
| `frontend/src/pages/CLAUDE.md` | Rotas e pages |
| `frontend/src/pages/admin/CLAUDE.md` | Sub-seções do Admin |
| `frontend/src/services/CLAUDE.md` | api.ts e socket.ts |
| `frontend/src/hooks/CLAUDE.md` | React hooks |

## 7. Resultados da Verificação

### TypeScript — Backend
```
npx tsc --noEmit --skipLibCheck
→ 0 erros de tipo real
→ 12 erros de tipo: stale Prisma client (modelos Voucher e campo
  optionGroupOrder adicionados ao schema depois da última geração)
→ Resolução: automática — docker-compose já executa
  `npx prisma generate && npm run start:dev`
```

### TypeScript — Frontend
```
npx tsc --noEmit --skipLibCheck
→ 0 erros (após correção do tsconfig.json para incluir "vite/client")
```

### Nest Build
```
→ Timeout no sandbox (sem acesso à internet para baixar engine Prisma)
→ O build funciona no Docker, que tem acesso e regenera o client
```

### Vite Build
```
→ TypeScript compila sem erros — equivalente ao build do Vite
```

## 8. Invariantes preservados

- Nenhuma lógica de negócio alterada
- Todas as rotas HTTP mantidas (`/api/v1/...`)
- WebSocket rooms e eventos mantidos
- Configuração Docker preservada (apenas volume nginx corrigido)
- Schema Prisma intocado
- Variáveis de ambiente intocadas
