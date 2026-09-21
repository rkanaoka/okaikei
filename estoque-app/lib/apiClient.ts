export interface Insumo {
  id: string;
  name: string;
  unidadeBase: 'MG' | 'ML' | 'UN';
  estoqueAtual: string | number;
  estoqueMinimo: string | number | null;
  codigoBarras: string | null;
}

export interface Movimentacao {
  id: string;
  insumoId: string;
  tipo: 'ENTRADA' | 'SAIDA' | 'AJUSTE';
  origem: 'MANUAL' | 'NFE';
  quantidade: string | number;
  observacao: string | null;
  createdAt: string;
  insumo: { id: string; name: string; unidadeBase: string };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/v1/estoque/${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || body?.error || `Erro ${res.status}`);
  }
  return res.json();
}

export const api = {
  listarInsumos: () => request<Insumo[]>('insumos'),
  buscarInsumos: (q: string) => request<Insumo[]>(`insumos?q=${encodeURIComponent(q)}`),
  buscarPorCodigoBarras: (barcode: string) => request<Insumo[]>(`insumos?barcode=${encodeURIComponent(barcode)}`),
  alertas: () => request<Insumo[]>('alertas'),
  movimentacoes: (limit = 20) => request<Movimentacao[]>(`movimentacoes?limit=${limit}`),
  registrarContagem: (insumoId: string, quantidade: number) =>
    request('contagem', { method: 'POST', body: JSON.stringify({ insumo_id: insumoId, quantidade }) }),
  registrarSaida: (itens: Array<{ insumo_id: string; quantidade: number }>) =>
    request('saida', { method: 'POST', body: JSON.stringify({ itens }) }),
};
