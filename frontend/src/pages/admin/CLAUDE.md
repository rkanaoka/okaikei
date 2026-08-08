# CLAUDE.md — frontend/src/pages/admin/

## Objetivo
Sub-seções do painel administrativo. Cada arquivo é um componente de seção
montado pelo shell `Admin.tsx` via roteamento interno (sidebar).

## Arquivos existentes
| Arquivo                  | Seção Admin             |
|--------------------------|-------------------------|
| `shared.tsx`             | Componentes e tipos compartilhados (BRAND, Card, Btn, etc.) |
| `Dashboard.tsx`          | KPIs do dia, pagamentos, histórico                |
| `Cardapio.tsx`           | CRUD de itens do cardápio                         |
| `Categorias.tsx`         | Gestão de categorias                              |
| `CardapioOpcoes.tsx`     | Grupos de opções (adicionais)                     |
| `FormasPagamento.tsx`    | Listagem de métodos de pagamento                  |
| `AcertoGarcons.tsx`      | Gorjetas compulsórias do dia                      |
| `FrentesCaixa.tsx`       | Frentes de caixa abertas                          |
| `ItensVendidos.tsx`      | Relatório de itens vendidos por período           |
| `Faturamento.tsx`        | Faturamento agrupado por dia                      |
| `TempoStatus.tsx`        | Tempo médio de atendimento                        |
| `Vouchers.tsx`           | Cupons e vouchers                                 |
| `MotivosCancelamento.tsx`| Motivos de cancelamento                           |
| `MotivosDesconto.tsx`    | Motivos de desconto                               |
| `ModelosImpressao.tsx`   | Modelos de impressão de comandas                  |
| `ConfigLoja.tsx`         | Dados da loja (nome, CNPJ, rodapé)                |

## Convenções
- Importar sempre de `./shared` para componentes e constantes comuns
- Cada componente é default export e recebe zero props (dados via API)
- Dados sempre via `services/api.ts` — nunca hardcoded

## Adicionar nova seção
1. Criar `NomeSecao.tsx` nesta pasta
2. Adicionar import em `../Admin.tsx`
3. Adicionar `SectionId` e entrada no `NAV` do Admin
4. Adicionar `case` no `renderSection()`
