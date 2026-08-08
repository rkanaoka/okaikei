# CLAUDE.md — frontend/src/

## Objetivo
Código-fonte do SPA React + Vite. Interface do operador do restaurante.

## Estrutura
```
src/
  App.tsx           # Roteamento principal (React Router)
  main.tsx          # Ponto de entrada (ReactDOM.render)
  pages/            # Telas completas da aplicação
    Admin.tsx       # Painel administrativo (shell com sidebar)
    Painel.tsx      # Dashboard — lista de comandas em tempo real
    Garcom.tsx      # Interface do garçom — selecionar mesa e lançar pedidos
    Caixa.tsx       # Interface do caixa — fechar conta e receber pagamento
    admin/          # Sub-seções do Admin (Dashboard, Cardapio, Relatorios, etc.)
    notion-faturamento/  # Importador de PDF de faturamento → Notion
    notion-extrato/      # Importador de extrato bancário → Notion
  components/       # Componentes reutilizáveis entre páginas
  hooks/            # Custom hooks React
  services/         # Clientes de API e WebSocket
  store/            # Estado global (reservado para expansão)
  styles/           # Estilos globais
```

## Rotas
| Path            | Componente    | Acesso               |
|-----------------|---------------|----------------------|
| `/`             | Painel        | Todos os terminais   |
| `/garcom`       | Garcom        | Terminais de garçom  |
| `/caixa/:id`    | Caixa         | Terminal de caixa    |
| `/admin`        | Admin         | Gerência             |

## Convenções
- Inline styles (sem CSS externo) — consistência com design system BRAND
- `@/` alias aponta para `src/` — sempre usar em imports
- Fetch via `services/api.ts` — nunca `fetch()` direto nos componentes
- WebSocket via `hooks/useSocket.ts`

## Não pertence aqui
- Lógica de negócio pesada (validações complexas ficam no backend)
- Chamadas diretas ao banco de dados
- Segredos ou configurações de ambiente hardcoded
