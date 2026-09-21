const UNIDADE_LABEL: Record<string, string> = { MG: 'g', ML: 'ml', UN: 'un' };

// Saldo é sempre gravado em MG (miligramas), então exibimos em gramas — mais
// legível para o operador conferindo estoque de cozinha.
export function formatQuantidade(valor: string | number, unidadeBase: string): string {
  let n = Number(valor);
  if (unidadeBase === 'MG') n = n / 1000;
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
}

export function unidadeLabel(unidadeBase: string): string {
  return UNIDADE_LABEL[unidadeBase] ?? unidadeBase;
}

export function formatDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const TIPO_LABEL: Record<string, string> = {
  ENTRADA: 'Entrada',
  SAIDA: 'Saída',
  AJUSTE: 'Contagem',
};
