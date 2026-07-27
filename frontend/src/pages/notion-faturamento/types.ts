export interface FaturamentoRow {
  data: string;
  dataIso: string;
  diaSemana: string;
  vendas: number;
  valorDeVendas: number;
  valorAcumulado: number;
  ticketMedio: number;
  totalDosItens: number;
  taxaDeEntrega: number;
  taxaDeServico: number;
  acrescimos: number;
  descontos: number;
  vendasCanceladas: number;
  valorDeVendasCanceladas: number;
}

export interface ParseResponse {
  loja: string | null;
  fileName: string;
  rows: FaturamentoRow[];
}

export type SyncStatus = 'criado' | 'atualizado' | 'erro';

export interface SyncResultItem {
  data: string;
  status: SyncStatus;
  message?: string;
}

export interface SyncResponse {
  createdProperties: string[];
  results: SyncResultItem[];
}

export interface HealthResponse {
  ok: boolean;
  notionConfigured: boolean;
}
