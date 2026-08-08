# CLAUDE.md — docker/

## Objetivo
Arquivos de configuração de infraestrutura de contêiner, organizados por serviço.

## Estrutura
```
docker/
  nginx/
    nginx.conf    # Configuração do proxy reverso (roteamento API + SPA)
```

## nginx/nginx.conf
- Proxy reverso: `/api/*` → backend:3001, `/ws/*` → backend:3001 (WebSocket)
- SPA fallback: rotas do frontend → `/index.html`
- Porta exposta: 8080 (host) → 80 (container)
- Referenciado em `docker-compose.yml`: `./docker/nginx/nginx.conf`

## Convenções
- Um subdiretório por serviço: `nginx/`, `postgres/` (se houver custom config), etc.
- Configs de desenvolvimento em `development/`, produção em `production/` (quando houver)

## Não pertence aqui
- Dockerfiles (ficam junto ao código do serviço: `backend/Dockerfile`, `frontend/Dockerfile`)
- docker-compose.yml (fica na raiz do projeto)
- Scripts de automação (ficam em `scripts/`)
