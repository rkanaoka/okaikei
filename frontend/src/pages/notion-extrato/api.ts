/**
 * Cliente de API do módulo "Extrato bancário → Notion".
 *
 * Usa o MESMO serviço backend do módulo notion-faturamento (Node/Express
 * independente, porta 3002 por padrão) — veja notion-faturamento/README.md.
 */
import axios from 'axios';
import type { ExtratoParseResponse, ExtratoSyncResponse, HealthResponse, ExtratoTransaction } from './types';

const BASE_URL = import.meta.env.VITE_NOTION_FATURAMENTO_API_URL ?? 'http://localhost:3002';

const http = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
});

http.interceptors.response.use(
  (r) => r,
  (err) => {
    const msg = err.response?.data?.details ?? err.response?.data?.error ?? err.message ?? 'Erro desconhecido';
    return Promise.reject(new Error(msg));
  },
);

export const extratoApi = {
  health: () => http.get<HealthResponse>('/api/health').then((r) => r.data),

  parse: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return http
      .post<ExtratoParseResponse>('/api/extrato/parse', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  parseXlsx: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return http
      .post<ExtratoParseResponse>('/api/extrato/parse-xlsx', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  sync: (rows: ExtratoTransaction[], contaFinanceira: string, competencia: string) =>
    http
      .post<ExtratoSyncResponse>('/api/extrato/sync', { rows, contaFinanceira, competencia })
      .then((r) => r.data),
};
