export interface ExtratoTransaction {
  data: string;
  dataIso: string;
  descricao: string;
  entrada: number | null;
  saida: number | null;
  chave: string;
}

export interface ExtratoParseResponse {
  fileName: string;
  periodo: string;
  competenciaDefault: string;
  contaFinanceiraDefault: string;
  transactions: ExtratoTransaction[];
}

export type SyncStatus = 'criado' | 'atualizado' | 'erro';

export interface ExtratoSyncResultItem {
  chave: string;
  data: string;
  descricao: string;
  status: SyncStatus;
  message?: string;
}

export interface ExtratoSyncResponse {
  results: ExtratoSyncResultItem[];
}

export interface HealthResponse {
  ok: boolean;
  notionConfigured: boolean;
  extratoNotionConfigured: boolean;
}
