/**
 * API Client — Local-First
 * Sempre aponta para o servidor local (LAN).
 * Nunca depende de internet.
 */
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

const http: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

http.interceptors.response.use(
  (r) => r.data,
  (err) => {
    const msg = err.response?.data?.message ?? err.message ?? 'Erro desconhecido';
    return Promise.reject(new Error(msg));
  },
);

// ── Menu ─────────────────────────────────────────────────────────────────────
export const menuApi = {
  list:   ()       => http.get('/menu'),
  create: (d: any) => http.post('/menu', d),
  update: (id: string, d: any) => http.put(`/menu/${id}`, d),
  remove: (id: string)         => http.delete(`/menu/${id}`),
};

// ── Tables ────────────────────────────────────────────────────────────────────
export const tablesApi = {
  list: () => http.get('/tables'),
};

// ── Comandas / Orders ─────────────────────────────────────────────────────────
export const comandasApi = {
  list:  (status?: string) => http.get('/comandas', { params: status ? { status } : {} }),
  get:   (id: string)      => http.get(`/comandas/${id}`),

  open: (d: { tableId?: string; customerName?: string; notes?: string }) =>
    http.post('/comandas', d),

  addItems: (id: string, items: Array<{ menuItemId: string; quantity: number; notes?: string }>) =>
    http.post(`/comandas/${id}/items`, { items, print: true }),

  removeItem: (id: string, itemId: string, d: { reasonId: string; password: string }) =>
    http.delete(`/comandas/${id}/items/${itemId}`, { data: d }),

  pay: (id: string, d: {
    surchargeType?: string; surchargeValue?: number;
    discountType?:  string; discountValue?:  number;
    payments: Array<{ method: string; amount: number }>;
    printReceipt?: boolean;
  }) => http.post(`/comandas/${id}/pay`, d),
};

// ── Frente de Caixa ────────────────────────────────────────────────────────────
export const cashApi = {
  current: () => http.get('/cash/current'),

  open: (d: { openingAmount: number; notes?: string }) => http.post('/cash/open', d),

  addMovement: (id: string, d: { type: 'WITHDRAWAL'|'REINFORCEMENT'; amount: number; notes?: string }) =>
    http.post(`/cash/${id}/movements`, d),

  summary: (id: string) => http.get(`/cash/${id}/summary`),

  close: (id: string, d: { closingCounts: Record<string, number>; notes?: string }) =>
    http.post(`/cash/${id}/close`, d),
};

// ── Motivos de Cancelamento / Desconto ─────────────────────────────────────────
export const reasonsApi = {
  cancellation: {
    list:    () => http.get('/reasons/cancellation'),
    create:  (d: { label: string }) => http.post('/reasons/cancellation', d),
    history: () => http.get('/reasons/cancellation/history'),
  },
  discount: {
    list:   () => http.get('/reasons/discount'),
    create: (d: { label: string; type: 'percent'|'fixed'; value: number }) => http.post('/reasons/discount', d),
  },
};

// ── Modelos de Impressão ────────────────────────────────────────────────────────
export const printTemplatesApi = {
  list:   () => http.get('/print-templates'),
  get:    (type: string) => http.get(`/print-templates/${type}`),
  update: (type: string, d: { enabled?: boolean; config?: Record<string, any> }) =>
    http.put(`/print-templates/${type}`, d),
  reset:  (type: string) => http.post(`/print-templates/${type}/reset`, {}),
  test:   (type: string, d: { enabled?: boolean; config?: Record<string, any> }) =>
    http.post(`/print-templates/${type}/test`, d),
};

// ── Sync ──────────────────────────────────────────────────────────────────────
export const syncApi = {
  status: () => http.get('/sync/status'),
  flush:  () => http.post('/sync/flush'),
};

export default http;
