# CLAUDE.md — shared/infrastructure/

## Objetivo
Implementações concretas de infraestrutura compartilhada por todos os módulos.

## Pastas
| Pasta        | Responsabilidade                             | Tecnologia  |
|--------------|----------------------------------------------|-------------|
| `database/`  | Conexão e cliente ORM                        | Prisma      |
| `cache/`     | Cache em memória distribuído                 | Redis/ioredis |
| `messaging/` | Mensageria assíncrona                        | NATS JetStream |

## database/ (Prisma)
- `prisma.service.ts` — extends PrismaClient, injeta em toda a aplicação
- `prisma.module.ts` — Global module, não precisa re-importar em cada módulo

## cache/ (Redis)
- `redis.service.ts` — wrapper sobre ioredis com métodos helper
- `redis.module.ts` — Global module

## messaging/ (NATS)
- `nats.service.ts` — cliente NATS com reconexão automática e fallback silencioso
- `nats.module.ts` — Global module

## Importar nos serviços
```typescript
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { RedisService }  from '@/shared/infrastructure/cache/redis.service';
import { NatsService }   from '@/shared/infrastructure/messaging/nats.service';
```

## Não adicionar aqui
- Repositórios específicos de módulo (ex: MenuItemRepository → vai em modules/menu/infrastructure/)
- Lógica de negócio
