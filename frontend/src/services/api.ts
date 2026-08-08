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
  list:    ()       => http.get('/menu'),
  listAll: ()       => http.get('/menu', { params: { all: 'true' } }),
  create:  (d: any) => http.post('/menu', d),
  update:  (id: string, d: any) => http.put(`/menu/${id}`, d),
  remove:  (id: string)         => http.delete(`/menu/${id}`),

  categories: {
    list:   () => http.get('/menu/categories'),
    create: (d: { name: string; sortOrder?: number }) => http.post('/menu/categories', d),
    update: (id: string, d: { name?: string; sortOrder?: number }) => http.put(`/menu/categories/${id}`, d),
  },
};

// ── Grupos de Opções (personalização de itens) ─────────────────────────────────
export const optionGroupsApi = {
  list:   ()       => http.get('/option-groups'),
  get:    (id: string) => http.get(`/option-groups/${id}`),
  create: (d: any)     => http.post('/option-groups', d),
  update: (id: string, d: any) => http.put(`/option-groups/${id}`, d),
  remove: (id: string)         => http.delete(`/option-groups/${id}`),
  setItems: (id: string, menuItemIds: string[]) => http.put(`/option-groups/${id}/items`, { menuItemIds }),
  updateOption: (optionId: string, d: { name?: string; price?: number; active?: boolean }) =>
    http.put(`/option-groups/options/${optionId}`, d),
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

  addItems: (id: string, items: Array<{ menuItemId: string; quantity: number; notes?: string }>, print = true) =>
    http.post(`/comandas/${id}/items`, { items, print }),

  removeItem: (id: string, itemId: string, d: { reasonId: string; password: string }) =>
    http.delete(`/comandas/${id}/items/${itemId}`, { data: d }),

  transferItems: (id: string, d: { itemIds: string[]; targetComandaId: string }) =>
    http.post(`/comandas/${id}/transfer-items`, d),

  changeTable: (id: string, d: { tableId: string }) => http.put(`/comandas/${id}/table`, d),

  mergeTable: (tableId: string) => http.post('/comandas/merge-table', { tableId }),

  printSummary: (id: string) => http.post(`/comandas/${id}/print-summary`, {}),

  pay: (id: string, d: {
    surchargeType?: string; surchargeValue?: number;
    discountType?:  string; discountValue?:  number;
    voucherId?:     string;
    payments: Array<{ method: string; amount: number }>;
    printReceipt?: boolean;
  }) => http.post(`/comandas/${id}/pay`, d),
};

// ── Frente de Caixa ────────────────────────────────────────────────────────────
export const cashApi = {
  list: (d?: { from?: string; to?: string }) => http.get('/cash', { params: d }),

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

// ── Vouchers (Cupons de Desconto) ──────────────────────────────────────────────
export type VoucherInput = {
  customerName: string; customerCpf: string; customerBirthDate: string;
  customerAddress: string; customerPhone: string; customerEmail: string;
  amount: number; dueDate: string; status?: string;
};

export const vouchersApi = {
  list:   ()       => http.get('/vouchers'),
  create: (d: VoucherInput) => http.post('/vouchers', d),
  update: (id: string, d: Partial<VoucherInput>) => http.put(`/vouchers/${id}`, d),

  getByCode: (code: string) => http.get(`/vouchers/by-code/${encodeURIComponent(code)}`),
  confirm:   (id: string, password: string) => http.post(`/vouchers/${id}/confirm`, { password }),
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

// ── Etiquetas de Validade (Controle de Estoque) ───────────────────────────────
export const etiquetasApi = {
  status: () => http.get('/estoque/etiquetas/status'),
  print:  (d: {
    produto: string; fabricante: string; lote: string; sif: string;
    dataManip: string; dataValidade: string; responsavel: string; quantidade: number;
  }) => http.post('/estoque/etiquetas/print', d),
};

// ── Sync ──────────────────────────────────────────────────────────────────────
export const syncApi = {
  status: () => http.get('/sync/status'),
  flush:  () => http.post('/sync/flush'),
};

export default http;
