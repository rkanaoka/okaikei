# CLAUDE.md — frontend/src/services/

## Objetivo
Camada de acesso a dados do frontend. Abstrai fetch HTTP e WebSocket.

## Arquivos
| Arquivo      | Descrição                                                      |
|--------------|----------------------------------------------------------------|
| `api.ts`     | Funções tipadas para cada endpoint REST (`/api/v1/...`)        |
| `socket.ts`  | Inicialização e singleton do cliente Socket.io                 |

## api.ts — padrão de uso
```typescript
// GET
export const getMenuItems = () => fetch('/api/v1/menu').then(r => r.json());

// POST
export const createOrder = (body: CreateOrderDto) =>
  fetch('/api/v1/orders', { method:'POST', body: JSON.stringify(body),
    headers:{'Content-Type':'application/json'} }).then(r => r.json());
```

## socket.ts — padrão de uso
```typescript
import { socket } from '@/services/socket';
socket.emit('join:table', { tableId });
socket.on('order:updated', handler);
```

## Não fazer
- `fetch` direto em componentes ou pages — sempre via services/api.ts
- Múltiplas instâncias de socket — importar o singleton de socket.ts
