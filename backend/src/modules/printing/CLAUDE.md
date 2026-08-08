# CLAUDE.md — backend/src/modules/printing/

## Estrutura
```
printing/
  domain/
    entities/          # Entidades puras (sem ORM)
    repositories/      # Interfaces (portas)
  application/
    use-cases/         # Serviços / orquestração
    dto/               # Data Transfer Objects
  infrastructure/
    repositories/      # Adapters Prisma
  printing.module.ts
```

## Controller
`PRINTINGController` em `@/runtimes/api/controllers/printing.controller.ts`

## Regras gerais
- Nunca importar de outro módulo diretamente — usar interfaces do domínio
- Serviços cross-module via injeção de dependência declarada no módulo
