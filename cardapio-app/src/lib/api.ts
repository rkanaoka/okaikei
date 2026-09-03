import axios from 'axios';
import type { Category, MenuItem, Comanda, CartItem } from './types';

const http = axios.create({ baseURL: '/api' });

export const menuApi = {
  getAll(): Promise<{ categories: Category[]; items: MenuItem[] }> {
    return http.get<{ categories: Category[]; items: MenuItem[] }>('/menu').then((r) => r.data);
  },
};

export const pedidosApi = {
  create(d: {
    customerName: string;
    // tableId (mesa identificada via QR Code) tem prioridade sobre tableNumber
    // (entrada manual, legado — assume tipo "Mesa").
    tableId?: string;
    tableNumber?: string;
    items: { menuItemId: string; quantity: number; notes?: string }[];
  }): Promise<Comanda> {
    // A API (vps-api/backend) espera "qty", não "quantity" — só a camada de API
    // traduz; o resto do app usa "quantity" internamente.
    const payload = {
      customerName: d.customerName,
      tableId: d.tableId,
      tableNumber: d.tableId ? undefined : d.tableNumber,
      items: d.items.map((i) => ({ menuItemId: i.menuItemId, qty: i.quantity, notes: i.notes })),
    };
    return http.post<Comanda>('/pedidos', payload).then((r) => r.data);
  },

  get(token: string): Promise<Comanda> {
    return http.get<Comanda>(`/pedidos/${token}`).then((r) => r.data);
  },

  addItems(token: string, items: CartItem[]): Promise<Comanda> {
    const payload = items.map((i) => ({
      menuItemId: i.menuItemId,
      qty: i.quantity,
      notes: i.notes,
    }));
    return http.post<Comanda>(`/pedidos/${token}/items`, { items: payload }).then((r) => r.data);
  },
};
