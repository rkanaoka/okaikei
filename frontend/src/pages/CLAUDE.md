# CLAUDE.md — frontend/src/pages/

## Objetivo
Páginas raiz da aplicação. Cada arquivo corresponde a uma rota definida em `App.tsx`.

## Páginas
| Arquivo               | Rota                    | Descrição                              |
|-----------------------|-------------------------|----------------------------------------|
| `Painel.tsx`          | `/`                     | Visão geral das mesas (mapa do salão)  |
| `Garcom.tsx`          | `/garcom`               | Interface do garçom / comanda          |
| `Caixa.tsx`           | `/caixa/:id`            | Fechamento de conta e pagamento        |
| `Admin.tsx`           | `/admin`                | Painel administrativo (shell + sidebar)|
| `notion-faturamento.tsx` | `/notion-faturamento`| Importador PDF → Notion (faturamento)  |
| `notion-extrato.tsx`  | `/notion-extrato`       | Importador extrato Itaú → Notion       |

## Sub-pastas
- `admin/` — componentes de seção do Admin (ver `admin/CLAUDE.md`)

## Convenções
- Pages são default exports sem props obrigatórias
- Dados sempre via `../services/api.ts` ou `../hooks/useSocket.ts`
- Não redirecionar de dentro da page — use `<Navigate>` no `App.tsx`
