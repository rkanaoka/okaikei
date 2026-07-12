# ─────────────────────────────────────────────────────────────────────────────
# Bodogami — Makefile
# Usage: make <target>
# ─────────────────────────────────────────────────────────────────────────────
.DEFAULT_GOAL := help
.PHONY: help up down restart logs ps build \
        migrate push seed studio \
        backup restore \
        shell-db shell-backend shell-frontend \
        lint format test

COMPOSE  = docker compose
BACKEND  = $(COMPOSE) exec backend
DB_SVC   = $(COMPOSE) exec postgres

# Valores do banco — devem bater com .env.development
DB_USER = bodogami
DB_NAME = bodogami_local
DB_PASS = bodogami_secret

## ── Help ─────────────────────────────────────────────────────────────────────
help:
	@echo ""
	@echo "  Bodogami — comandos disponíveis"
	@echo "  ─────────────────────────────────────────────────────────────────"
	@echo "  make up           Sobe todos os serviços em background"
	@echo "  make down         Para e remove containers (preserva volumes)"
	@echo "  make restart      Para e sobe de novo"
	@echo "  make logs         Segue os logs de todos os serviços"
	@echo "  make logs s=NAME  Segue os logs de um serviço específico"
	@echo "  make ps           Lista containers em execução"
	@echo "  make build        Rebuilda imagens sem cache"
	@echo "  ─────────────────────────────────────────────────────────────────"
	@echo "  make push         Aplica schema Prisma direto no banco (1a vez)"
	@echo "  make migrate      Roda migrações Prisma (deploy)"
	@echo "  make seed         Popula o banco com dados iniciais"
	@echo "  make studio       Abre o Prisma Studio (http://localhost:5555)"
	@echo "  ─────────────────────────────────────────────────────────────────"
	@echo "  make backup       Dispara backup manual do banco"
	@echo "  make restore f=   Restaura um .sql.gz (ex: f=backups/dump.sql.gz)"
	@echo "  ─────────────────────────────────────────────────────────────────"
	@echo "  make shell-db     psql no container PostgreSQL"
	@echo "  make shell-backend  sh no container do backend"
	@echo "  make shell-frontend sh no container do frontend"
	@echo "  ─────────────────────────────────────────────────────────────────"
	@echo "  make lint         ESLint no backend"
	@echo "  make test         Testes unitários do backend"
	@echo ""

## ── Docker ───────────────────────────────────────────────────────────────────
up:
	$(COMPOSE) up -d
	@echo "✓  Serviços no ar. Frontend: http://localhost"

down:
	$(COMPOSE) down

restart: down up

logs:
ifdef s
	$(COMPOSE) logs -f $(s)
else
	$(COMPOSE) logs -f
endif

ps:
	$(COMPOSE) ps

build:
	$(COMPOSE) build --no-cache

## ── Database ─────────────────────────────────────────────────────────────────
# Primeira vez: empurra o schema Prisma sem precisar de arquivos de migration
push:
	$(BACKEND) npx prisma db push
	@echo "✓  Schema aplicado."

migrate:
	$(BACKEND) npx prisma migrate deploy
	@echo "✓  Migrações aplicadas."

seed:
	$(BACKEND) npx ts-node prisma/seed.ts
	@echo "✓  Seed concluído."

studio:
	@echo "Abrindo Prisma Studio em http://localhost:5555 …"
	$(BACKEND) npx prisma studio --browser none --port 5555

## ── Backup ───────────────────────────────────────────────────────────────────
backup:
	@echo "Iniciando backup manual…"
	$(COMPOSE) run --rm backup /backup.sh
	@echo "✓  Backup concluído. Veja ./backups/"

restore:
ifndef f
	@echo "Uso: make restore f=backups/bodogami_YYYYMMDD_HHMMSS.sql.gz"
	@exit 1
endif
	@echo "Restaurando $(f)…"
	zcat $(f) | $(DB_SVC) psql -U $(DB_USER) -d $(DB_NAME)
	@echo "✓  Banco restaurado."

## ── Shells ───────────────────────────────────────────────────────────────────
shell-db:
	$(DB_SVC) psql -U $(DB_USER) -d $(DB_NAME)

shell-backend:
	$(BACKEND) sh

shell-frontend:
	$(COMPOSE) exec frontend sh

## ── Impressoras ──────────────────────────────────────────────────────────────
print-status:
	curl -s http://localhost:3001/print/status | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.stringify(JSON.parse(d),null,2)))"

print-test-caixa:
	curl -s -X POST http://localhost:3001/print/test/cashier | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.stringify(JSON.parse(d),null,2)))"

print-test-cozinha:
	curl -s -X POST http://localhost:3001/print/test/kitchen | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.stringify(JSON.parse(d),null,2)))"

print-test-bar:
	curl -s -X POST http://localhost:3001/print/test/bar | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.stringify(JSON.parse(d),null,2)))"

## ── Dev ──────────────────────────────────────────────────────────────────────
lint:
	$(BACKEND) npm run lint

format:
	$(BACKEND) npm run format

test:
	$(BACKEND) npm run test
