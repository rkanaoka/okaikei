# CLAUDE.md — frontend/src/components/

## Objetivo
Componentes reutilizáveis entre páginas (não são rotas).

## Arquivos existentes
| Arquivo                | Uso                                                        |
|-------------------------|-------------------------------------------------------------|
| `CashRegisterMenu.tsx`  | Menu/modais de abertura, movimentação e fechamento de caixa |
| `CurrencyInput.tsx`     | Campo padrão para digitar valores em R$                     |

## CurrencyInput — padrão obrigatório para valores em R$
Todo campo onde o operador digita um valor em Reais deve usar
`CurrencyInput`, nunca um `<input type="number">` puro. Motivo: o navegador
não aceita `,` como separador decimal em `type="number"`, e não há como
selecionar-tudo-ao-focar de forma consistente sem lógica própria.

```tsx
import CurrencyInput from '@/components/CurrencyInput';

<CurrencyInput
  value={form.price}                       // string, sempre com '.' como separador
  onChange={(v) => setForm({ ...form, price: v })}
  placeholder="0.00"
  style={{ ... }}                          // mesmo objeto de estilo que um <input> normal
/>
```

Comportamento embutido (não precisa reimplementar em cada tela):
- Seleciona todo o conteúdo ao focar (`onFocus` → `select()`), para que digitar sobrescreva.
- Aceita `,` ou `.` como separador decimal digitado; normaliza para `.` internamente.
- Limita a 2 casas decimais enquanto digita; formata para exatamente 2 casas ao perder o foco (`10` → `10.00`).
- Descarta caracteres não numéricos (inclusive `-`, então valores negativos nunca chegam a ser digitados).
- O valor armazenado no estado (`value`/`onChange`) é sempre uma string com `.`, pronta para `Number()`/`parseFloat()` — nenhum código a jusante precisa mudar.

**Não usar `CurrencyInput` para:** percentuais, quantidades, ou qualquer campo numérico que não seja R$ — esses continuam com `<input type="number">` nativo.

**Campos duplos (R$ ou %, com um `<select>` ao lado):** renderizar condicionalmente —
`CurrencyInput` quando o modo for R$/fixo, `<input type="number">` quando for percentual.
Ver exemplos em `pages/Caixa.tsx` (`GratuityControl`, desconto) e `pages/admin/Vouchers.tsx`.
