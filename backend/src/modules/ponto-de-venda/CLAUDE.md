# CLAUDE.md — modules/ponto-de-venda/

## Responsabilidade
Bounded Context do Ponto de Venda. Engloba todos os sub-domínios operacionais:
cardápio, mesas, comandas, caixa, pagamentos, vouchers, impressão e motivos.

## Sub-domínios internos
| Conceito             | Service                 | Port                              |
|----------------------|-------------------------|-----------------------------------|
| Cardápio             | MenuService             | MenuRepositoryPort                |
| Grupos de opção      | OptionGroupsService     | OptionGroupRepositoryPort         |
| Comandas             | OrdersService           | OrdersRepositoryPort              |
| Mesas                | TablesService           | TableRepositoryPort               |
| Caixa                | CashService             | CashRepositoryPort                |
| Vouchers             | VouchersService         | VoucherRepositoryPort             |
| Impressão            | PrintingService         | PrinterRepositoryPort + EscPosClientPort |
| Modelos de impressão | PrintTemplatesService   | PrintTemplateRepositoryPort       |
| Motivos              | ReasonsService          | ReasonsRepositoryPort             |

## Dependências externas
- SyncModule (`@/modules/sync/`) — enfileiramento de eventos de sync
- GatewayModule (global) — WEBSOCKET_PUBLISHER_PORT
- PrismaModule (global) — banco de dados
- RedisModule (global) — cache
- NatsModule (global) — mensageria
