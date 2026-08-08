# CLAUDE.md — backend/src/shared/

## Objetivo
Contém apenas código verdadeiramente reutilizável e neutro — sem regras de negócio específicas.

## Estrutura
```
shared/
  domain/
    value-objects/     # Tipos genéricos (Money, Period, Result, etc.)
  application/
                       # Interfaces e contratos transversais
  infrastructure/
    database/          # PrismaService + PrismaModule
    cache/             # RedisService + RedisModule
    messaging/         # NatsService + NatsModule
```

## O que pode existir aqui
- Tipos utilitários (Result, Either, Pagination)
- Value objects genéricos (Money, DateRange)
- Serviços de infraestrutura compartilhada (banco, cache, mensageria)
- Decorators transversais
- Guards globais

## O que NÃO pode existir aqui
- Regras de negócio de qualquer módulo
- Entidades de domínio específicas (Comanda, MenuItem, etc.)
- Use-cases ou services de funcionalidade

## Alerta: shared não é lixeira
Antes de adicionar algo aqui, verificar: "isso é realmente usado por 2+ módulos independentes
e não carrega lógica de negócio específica?" Se não, pertence ao módulo correspondente.
