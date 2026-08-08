# CLAUDE.md — runtimes/api/controllers/

## Objetivo
Controllers HTTP da API REST. Camada de apresentação — recebe requisições,
valida entrada (DTOs), delega para use-cases e retorna resposta.

## Um controller por módulo de domínio
| Controller                    | Módulo               | Prefixo de rota      |
|-------------------------------|----------------------|----------------------|
| `menu.controller.ts`          | menu                 | `/api/menu`          |
| `option-groups.controller.ts` | option-groups        | `/api/option-groups` |
| `orders.controller.ts`        | orders               | `/api/comandas`      |
| `tables.controller.ts`        | tables               | `/api/tables`        |
| `cash.controller.ts`          | cash                 | `/api/cash`          |
| `vouchers.controller.ts`      | vouchers             | `/api/vouchers`      |
| `printing.controller.ts`      | printing             | `/api/print`         |
| `print-templates.controller.ts` | print-templates    | `/api/print-templates` |
| `reasons.controller.ts`       | reasons              | `/api/reasons`       |
| `sync.controller.ts`          | sync                 | `/api/sync`          |

## Regras obrigatórias
1. Importar service do módulo via `@/modules/*/application/use-cases/`
2. Não instanciar repositórios ou Prisma diretamente
3. Não conter lógica de negócio (if/else de regra de negócio = sinal de problema)
4. Declarar no `*.module.ts` do módulo correspondente (providers: [...], controllers: [...])

## Convenção de nomenclatura
- Arquivo: `nome-do-modulo.controller.ts`
- Classe: `NomeDoModuloController`

## Exemplo
```typescript
import { MenuService } from '@/modules/menu/application/use-cases/menu.service';

@Controller('menu')
export class MenuController {
  constructor(private readonly menu: MenuService) {}
  // ...
}
```

## Não pertence aqui
- Lógica de negócio
- Acesso direto a banco de dados
- Transformação complexa de dados (use mappers em infrastructure/)
