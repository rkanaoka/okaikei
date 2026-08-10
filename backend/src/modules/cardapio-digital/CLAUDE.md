# CLAUDE.md — Módulo cardapio-digital

## Responsabilidade
Expõe endpoints REST para a VPS consumir via WireGuard VPN.
Permite que o cardápio digital do cliente final (VPS) acesse o cardápio,
crie pedidos e acompanhe o status de comandas no restaurante.

Este módulo é de **integração**, não de domínio puro:
usa `PrismaService` diretamente (sem Repository Ports).

## Autenticação
Todos os endpoints exigem o header `x-api-key` com o valor de `process.env.LOCAL_API_KEY`.
Implementado via `ApiKeyGuard` (NestJS Guard).

## Endpoints (prefixo `/cardapio`)

| Método | Path                           | Descrição                                      |
|--------|--------------------------------|------------------------------------------------|
| GET    | `/cardapio/menu`               | Cardápio completo (para a VPS cachear)         |
| POST   | `/cardapio/pedido`             | Cria uma comanda a partir de um pedido da VPS  |
| GET    | `/cardapio/comanda/:token`     | Status da comanda pelo UUID (token = ID)       |
| POST   | `/cardapio/comanda/:token/items` | Adiciona itens a uma comanda existente        |

## Como a VPS se conecta
- Conexão via WireGuard VPN (túnel privado entre VPS e restaurante)
- Base URL: `http://<ip-wireguard-restaurante>:<porta>/cardapio`
- Header obrigatório: `x-api-key: <LOCAL_API_KEY>`
- `LOCAL_API_KEY` deve ser igual nos dois lados (.env do backend e .env.vps)

## Lógica de mesa (tableNumber)
- Se a mesa existir na tabela `Table` pelo campo `number`, o `tableId` é vinculado
- Se não existir, a comanda é criada sem `tableId` e o número é salvo em `notes` como `"Mesa: X"`
- Na leitura, `tableNumber` é extraído de `table.number` ou parseado de `notes`

## Arquivos
```
modules/cardapio-digital/
  guards/api-key.guard.ts                    # Guard de autenticação por API key
  application/use-cases/
    cardapio-digital.service.ts              # Toda a lógica do módulo
  cardapio-digital.module.ts                 # Módulo NestJS
  CLAUDE.md                                  # Este arquivo

runtimes/api/controllers/
  cardapio-publico.controller.ts             # Controller dos 4 endpoints
```
