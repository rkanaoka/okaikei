const UNIDADE_LABEL: Record<string, string> = { MG: 'kg', ML: 'ml', UN: 'un' };

// Saldo é sempre gravado em MG (miligramas) no banco, mas o operador de cozinha
// trabalha em quilos — exibimos e recebemos entrada sempre em kg para insumos
// de Massa. ML/UN não têm conversão (fator 1, já são a própria unidade de trabalho).
export function unidadeTrabalhoFator(unidadeBase: string): number {
  return unidadeBase === 'MG' ? 1_000_000 : 1;
}

export function formatQuantidade(valor: string | number, unidadeBase: string): string {
  const n = Number(valor) / unidadeTrabalhoFator(unidadeBase);
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
}

/** Converte um valor digitado pelo operador (na unidade de trabalho, ex: kg) para a
 *  unidade-base crua que o backend espera (ex: mg). Usado em toda entrada de quantidade
 *  no estoque-app (contagem, retirada manual e bip do leitor BT). */
export function paraQuantidadeBase(valorDigitado: string, unidadeBase: string): number {
  const n = Number(valorDigitado.replace(',', '.')) || 0;
  return n * unidadeTrabalhoFator(unidadeBase);
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
