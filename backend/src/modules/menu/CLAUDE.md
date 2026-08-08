# CLAUDE.md — backend/src/modules/menu/

## Objetivo
Módulo de cardápio: criação, listagem, atualização e remoção de itens.

## Estrutura
```
menu/
  domain/
    entities/menu-item.entity.ts      # Entidade pura (sem ORM)
    repositories/menu.repository.ts   # Interface (porta)
  application/
    use-cases/menu.service.ts         # Orquestração + regras
    dto/create-menu-item.dto.ts
    dto/update-menu-item.dto.ts
  infrastructure/
    repositories/prisma-menu.repository.ts  # Adapter Prisma
  menu.module.ts
```

## Dependências externas
- `PrismaModule` (via `@/shared/infrastructure/database/prisma.module`)

## Controller
`MenuController` fica em `@/runtimes/api/controllers/menu.controller.ts`
e é declarado no `menu.module.ts`.

## Regras de domínio
- Um item pode ter `option_groups` associados (módulo option-groups)
- Preço nunca negativo; validado no DTO com `@Min(0)`
