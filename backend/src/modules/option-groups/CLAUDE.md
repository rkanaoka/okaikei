# CLAUDE.md — backend/src/modules/option-groups/

## Estrutura
```
option-groups/
  domain/
    entities/          # Entidades puras (sem ORM)
    repositories/      # Interfaces (portas)
  application/
    use-cases/         # Serviços / orquestração
    dto/               # Data Transfer Objects
  infrastructure/
    repositories/      # Adapters Prisma
  option-groups.module.ts
```

## Controller
`OPTION-GROUPSController` em `@/runtimes/api/controllers/option-groups.controller.ts`

## Regras gerais
- Nunca importar de outro módulo diretamente — usar interfaces do domínio
- Serviços cross-module via injeção de dependência declarada no módulo
