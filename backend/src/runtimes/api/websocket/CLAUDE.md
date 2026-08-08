# CLAUDE.md — backend/src/runtimes/api/websocket/

## Objetivo
WebSocket gateway via Socket.io (adaptado ao Fastify). Distribui eventos em tempo
real para os clientes (Painel, Garçom, Caixa).

## Arquivos
- `events.gateway.ts` — `@WebSocketGateway` com `@SubscribeMessage` handlers; gerencia rooms (mesas, caixa, global)
- `gateway.module.ts` — exporta o gateway para o `AppModule`

## Rooms convencionadas
| Room           | Quem entra                         |
|----------------|------------------------------------|
| `global`       | todos os clientes                  |
| `table:{id}`   | Garçom e Caixa de uma mesa         |
| `cash:{id}`    | Caixa específico                   |

## Emitir evento do backend
```typescript
// Em qualquer serviço que receba GatewayService via injeção:
this.gateway.server.to('global').emit('order:updated', payload);
```

## Não fazer
- Lógica de negócio no gateway — use use-cases e chame via serviço
- Nunca importar diretamente controllers aqui
