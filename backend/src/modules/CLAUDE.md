# CLAUDE.md — backend/src/modules/

## Objetivo
Módulos de negócio do sistema. Cada pasta representa um domínio ou capacidade do negócio.

## Módulos existentes
| Pasta            | Domínio                                |
|------------------|----------------------------------------|
| `menu/`          | Cardápio — itens e disponibilidade     |
| `option-groups/` | Grupos de opções dos itens             |
| `orders/`        | Comandas — abertura, itens, fechamento |
| `tables/`        | Mesas e balcões                        |
| `cash/`          | Frentes de caixa                       |
| `payments/`      | Pagamentos                             |
| `vouchers/`      | Cupons e vouchers                      |
| `printing/`      | Impressão ESC/POS                      |
| `print-templates/` | Modelos de impressão                 |
| `reasons/`       | Motivos de cancelamento/desconto       |
| `sync/`          | Sincronização offline→nuvem            |
| `config/`        | Configurações do sistema               |
| `auth/`          | Autenticação                           |
| `health/`        | Health check                           |

## Estrutura interna obrigatória de cada módulo
```
modulo/
  domain/
    entities/          # Entidades e objetos de valor do domínio
    repositories/      # Interfaces de repositório (contratos)
  application/
    use-cases/         # Services NestJS — casos de uso
    dto/               # Data Transfer Objects
    contracts/         # Interfaces de portas (importers, publishers)
  infrastructure/
    repositories/      # Implementações concretas dos repositórios
    mappers/           # Conversão entre modelos de domínio e persistência
  modulo.module.ts     # Módulo NestJS — wiring e DI
```

## Regras de dependência
- `domain/` NÃO importa nada externo (sem Prisma, sem NestJS específico)
- `application/` importa `domain/` e contratos de `shared/`
- `infrastructure/` importa `domain/` e bibliotecas externas (Prisma, Axios, etc.)
- Controllers ficam em `runtimes/api/controllers/`, NÃO nos módulos

## Dependências permitidas entre módulos
- Usar `@/modules/MODULO/application/use-cases/` para importar services de outros módulos
- Nunca importar infraestrutura de outro módulo diretamente

## Nomenclatura
- Arquivos: `nome-do-modulo.service.ts`, `nome-do-modulo.module.ts`
- Classes: `NomeDoModuloService`, `NomeDoModuloModule`
