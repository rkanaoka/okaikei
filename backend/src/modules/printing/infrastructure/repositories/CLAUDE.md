# CLAUDE.md — infrastructure/repositories/ (padrão para todos os módulos)

## O que é
Adapter Prisma que implementa o Port definido em `domain/repositories/`.
Única camada que conhece `PrismaService` e as queries Prisma.

## Regras
- Implementa **exclusivamente** a interface Port correspondente
- Toda lógica de query Prisma fica aqui — serviços nunca chamam `this.prisma.*` diretamente
- Transações complexas (`$transaction`) ficam aqui, nunca no serviço
- Retorna dados crus — sem enriquecer, sem calcular totais, sem chamar cache ou eventos

## Nomenclatura obrigatória
- `Prisma[Module]Repository` (ex: `PrismaMenuRepository`)
- Registrado no módulo como: `{ provide: MENU_REPOSITORY_PORT, useClass: PrismaMenuRepository }`

## Dependências permitidas
- `PrismaService` (injetado via construtor)
- `uuidv7` (para gerar IDs)
- Tipos do `@prisma/client`

## Dependências proibidas
- `RedisService` — cache fica no Use Case
- `NatsService`, `EventsGateway` — eventos ficam no Use Case
- Outros serviços de negócio — repositories são isolados
