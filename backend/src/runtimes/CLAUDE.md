# CLAUDE.md — backend/src/runtimes/

## Objetivo
Pontos de entrada do sistema. Define COMO o sistema roda, não O QUE ele faz.
A camada runtimes monta o wiring (qual adapter concreto usar) e expõe o sistema.

## Estrutura
```
runtimes/
  api/
    app.module.ts     # Composition root — importa e conecta todos os módulos
    controllers/      # Controllers HTTP NestJS (um por módulo de negócio)
    websocket/        # Gateway WebSocket (Socket.io via NestJS)
```

## Responsabilidade de cada subpasta

### app.module.ts
- Importa todos os módulos de negócio
- Importa módulos de infraestrutura compartilhada
- Define configurações globais (ConfigModule, ScheduleModule)
- É o único lugar onde todos os módulos se conectam

### controllers/
- Recebe requisições HTTP e delega para use-cases
- Não contém lógica de negócio
- Um controller por módulo de domínio
- Importa services de `@/modules/*/application/use-cases/`

### websocket/
- Gateway Socket.io para comunicação em tempo real
- Emite eventos para clientes conectados (comandas, status, sync)
- Injetável nos services que precisam emitir eventos

## Regras
- Controllers NÃO importam Prisma, Redis, NATS diretamente
- Controllers NÃO implementam lógica de negócio
- app.module.ts É o único arquivo que importa todos os módulos juntos

## Exemplo correto de controller
```typescript
@Controller('menu')
export class MenuController {
  constructor(private readonly menu: MenuService) {}

  @Get() list() { return this.menu.findAll(); }
  @Post() create(@Body() dto: CreateMenuItemDto) { return this.menu.create(dto); }
}
```

## Não pertence aqui
- Services ou use-cases → `modules/*/application/use-cases/`
- Entidades de domínio → `modules/*/domain/entities/`
- Infraestrutura específica → `modules/*/infrastructure/`
