# CLAUDE.md — application/contracts/ (padrão para todos os módulos)

## O que é
Ports de saída que o Use Case depende para publicar eventos ou chamar serviços externos.
Fica na camada de aplicação — acima de infraestrutura, abaixo de domínio.

## Tipos de contratos aqui
- Publisher Port (ex: `ComandaEventPublisherPort`) — publica eventos em NATS/Kafka/RabbitMQ
- API Client Port (ex: `CloudSyncApiClientPort`) — chamadas HTTP a sistemas externos

## Regras
- Somente interfaces e tokens Symbol
- Implementações ficam em `infrastructure/publishers/` ou `infrastructure/api-clients/`
- Use Cases injetam a interface via `@Inject(TOKEN)`, nunca a classe concreta

## Exemplo
```typescript
export const COMANDA_EVENT_PUBLISHER_PORT = Symbol('ComandaEventPublisherPort');
export interface ComandaEventPublisherPort {
  publishComandaOpened(comanda: any): void;
}
```
