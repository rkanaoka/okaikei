# CLAUDE.md — backend/src/modules/print-templates/

## Estrutura
```
print-templates/
  domain/
    entities/          # Entidades puras (sem ORM)
    repositories/      # Interfaces (portas)
  application/
    use-cases/         # Serviços / orquestração
    dto/               # Data Transfer Objects
  infrastructure/
    repositories/      # Adapters Prisma
  print-templates.module.ts
```

## Controller
`PRINT-TEMPLATESController` em `@/runtimes/api/controllers/print-templates.controller.ts`

## Regras gerais
- Nunca importar de outro módulo diretamente — usar interfaces do domínio
- Serviços cross-module via injeção de dependência declarada no módulo
