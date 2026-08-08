# CLAUDE.md — infrastructure/publishers/

## O que é
Adapters de publicação de eventos. Implementam os Publisher Ports de `application/contracts/`.

## Regras
- Implementa exclusivamente o Port correspondente
- Responsável por: serializar, publicar, configurar headers
- Proibido: consultar banco, executar regras de negócio

## Nomenclatura
- `Nats[Entity]Publisher` — publica via NATS
- `Rabbit[Entity]Publisher` — publica via RabbitMQ
