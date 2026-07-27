/**
 * Cliente de API do módulo "Faturamento SAIPOS → Notion".
 *
 * Este módulo fala com um serviço Node/Express independente do backend
 * principal do POS (que roda em :3001 via /api). O serviço fica em
 * notion-faturamento/backend, na porta 3002 por padrão — veja o README
 * em notion-faturamento/README.md.
 */
import axios from 'axios';
import type { ParseResponse, SyncResponse, HealthResponse, FaturamentoRow } from './types';

const BASE_URL = import.meta.env.VITE_NOTION_FATURAMENTO_API_URL ?? 'http://localhost:3002';

const http = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
});

http.interceptors.response.use(
  (r) => r,
  (err) => {
    const msg = err.response?.data?.error ?? err.message ?? 'Erro desconhecido';
    return Promise.reject(new Error(msg));
  },
);

export const notionFaturamentoApi = {
  health: () => http.get<HealthResponse>('/api/health').then((r) => r.data),

  parse: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return http
      .post<ParseResponse>('/api/parse', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  sync: (rows: FaturamentoRow[]) =>
    http.post<SyncResponse>('/api/sync', { rows }).then((r) => r.data),
};
