# CLAUDE.md — backend/src/modules/config/

## Estrutura
```
config/
  domain/
    entities/          # Entidades puras (sem ORM)
    repositories/      # Interfaces (portas)
  application/
    use-cases/         # Serviços / orquestração
    dto/               # Data Transfer Objects
  infrastructure/
    repositories/      # Adapters Prisma
  config.module.ts
```

## Controller
`CONFIGController` em `@/runtimes/api/controllers/config.controller.ts`

## Regras gerais
- Nunca importar de outro módulo diretamente — usar interfaces do domínio
- Serviços cross-module via injeção de dependência declarada no módulo
