# CLAUDE.md — backend/src/modules/vouchers/

## Estrutura
```
vouchers/
  domain/
    entities/          # Entidades puras (sem ORM)
    repositories/      # Interfaces (portas)
  application/
    use-cases/         # Serviços / orquestração
    dto/               # Data Transfer Objects
  infrastructure/
    repositories/      # Adapters Prisma
  vouchers.module.ts
```

## Controller
`VOUCHERSController` em `@/runtimes/api/controllers/vouchers.controller.ts`

## Regras gerais
- Nunca importar de outro módulo diretamente — usar interfaces do domínio
- Serviços cross-module via injeção de dependência declarada no módulo
