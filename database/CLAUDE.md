# CLAUDE.md — database/

## Objetivo
Artefatos relacionados ao banco de dados, independentes de qualquer framework.

## Estrutura
```
database/
  migrations/   # Migrações históricas (node-pg-migrate)
  seeds/        # Dados iniciais para desenvolvimento
```

## migrations/
- Usa `node-pg-migrate` (arquivos JS)
- Numeração sequencial: `1_initial_schema.js`, `2_nome_da_mudanca.js`
- Nunca editar uma migração já aplicada — criar nova migração
- Para schema Prisma: usar `npx prisma db push` (desenvolvimento) ou `prisma migrate deploy` (produção)

## seeds/
- `seed.ts` — script Prisma para popular banco com dados iniciais
- Executar via: `make seed` ou `docker compose exec backend npx ts-node prisma/seed.ts`
- Idempotente: usar upsert, nunca insert sem verificação

## Não pertence aqui
- Lógica de aplicação
- Código de acesso a dados (repositories → em `backend/src/modules/*/infrastructure/`)
- Configuração de conexão (→ `backend/src/shared/infrastructure/database/`)
