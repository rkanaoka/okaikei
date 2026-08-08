# CLAUDE.md — frontend/src/hooks/

## Objetivo
React hooks customizados. Encapsulam estado e efeitos colaterais reutilizáveis.

## Arquivo atual
| Hook            | Descrição                                                  |
|-----------------|------------------------------------------------------------|
| `useSocket.ts`  | Conecta ao WebSocket, inscreve em eventos, limpa no unmount|

## useSocket — assinatura
```typescript
const { socket, connected } = useSocket();

// Assinar evento:
useEffect(() => {
  socket.on('order:updated', handler);
  return () => { socket.off('order:updated', handler); };
}, [socket]);
```

## Convenções
- Cada hook é um arquivo separado com prefixo `use`
- Hooks de dados (fetch) retornam `{ data, loading, error }`
- Nunca usar `useSocket` diretamente em sub-componentes — propagar via prop ou context
