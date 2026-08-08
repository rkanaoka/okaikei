# CLAUDE.md — shared/application/contracts/

## O que é
Ports compartilhados entre múltiplos módulos. Quando um port precisa ser usado por mais de
um contexto de domínio, ele fica aqui em vez de em `modules/[x]/application/contracts/`.

## Ports atuais
| Port                       | Token                       | Adapter                          |
|----------------------------|-----------------------------|----------------------------------|
| `WebSocketPublisherPort`   | `WEBSOCKET_PUBLISHER_PORT`  | `WebSocketGatewayPublisher`      |

## Regras
- Apenas interfaces e Symbol tokens — sem implementações
- Adapters ficam em `runtimes/api/websocket/publishers/` (para WS) ou no módulo correspondente
- O provider do port é registrado onde o adapter é definido (GatewayModule para WS)
