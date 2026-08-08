# CLAUDE.md — Raiz do Projeto Bodogami

## Visão geral
Sistema de PDV (Ponto de Venda) offline-first para o restaurante Bodogami.
Stack: NestJS + Fastify (backend), React + Vite (frontend), PostgreSQL, Redis, NATS.

## Estrutura de pastas

```
okaikei/
  backend/          # API NestJS — lógica de negócio e persistência
  frontend/         # SPA React/Vite — interface do operador
  database/         # Migrações SQL e seeds
    migrations/     # node-pg-migrate: 1_initial_schema.js, 2_seed_test_items.js
    seeds/          # seed.ts (Prisma seed para dados iniciais)
  docker/           # Configurações de contêiner
    nginx/          # nginx.conf — proxy reverso
  scripts/          # Scripts utilitários (backup.sh, init-db.sql)
  docs/             # Documentação e arquivos legados
  notion-faturamento/ # App auxiliar: importador PDF → Notion
  docker-compose.yml  # Orquestração de todos os serviços
  Makefile            # Comandos de desenvolvimento
  .env.development    # Variáveis de ambiente locais
```

## Como rodar
```bash
make up       # Sobe todos os serviços
make push     # Aplica schema Prisma (1ª vez)
make seed     # Popula banco com dados iniciais
make logs     # Acompanhar logs
```

## Arquitetura principal
- Local-first: funciona sem internet
- Sync queue: fila de eventos para sincronização eventual com nuvem
- WebSocket: atualizações em tempo real para todos os terminais
- ESC/POS: impressão direta em impressoras térmicas via TCP

## Não pertence à raiz
- Código de módulos de negócio → `backend/src/modules/`
- Componentes React → `frontend/src/`
- Configurações Docker individuais → respectivos `Dockerfile`
