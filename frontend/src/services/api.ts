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

  pay: (id: string, d: {
    surchargeType?: string; surchargeValue?: number;
    discountType?:  string; discountValue?:  number;
    payments: Array<{ method: string; amount: number }>;
    printReceipt?: boolean;
  }) => http.post(`/comandas/${id}/pay`, d),
};

// ── Sync ──────────────────────────────────────────────────────────────────────
export const syncApi = {
  status: () => http.get('/sync/status'),
  flush:  () => http.post('/sync/flush'),
};

export default http;
