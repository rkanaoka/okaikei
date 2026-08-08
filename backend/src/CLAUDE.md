# CLAUDE.md — backend/src/

## Objetivo
Raiz do código-fonte do backend NestJS. Contém apenas o ponto de entrada (`main.ts`)
e organiza o sistema nas três grandes pastas da arquitetura.

## Estrutura
```
src/
  main.ts                    # Ponto de entrada NestJS (Fastify adapter)
  modules/                   # Módulos de negócio (DDD)
  shared/                    # Infraestrutura compartilhada
  runtimes/                  # Pontos de entrada e wiring da API
```

## Regras
- `main.ts` importa AppModule de `./runtimes/api/app.module`
- Não criar arquivos diretamente em `src/` além do `main.ts`
- Não importar Prisma, Redis ou NATS diretamente em `main.ts`
