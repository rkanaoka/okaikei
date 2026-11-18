import axios from 'axios';
import type { Category, MenuItem, Comanda, CartItem, MenuSettings } from './types';

const http = axios.create({ baseURL: '/api' });

export const menuApi = {
  // settings é opcional: backends/caches antigos ainda não enviam a vitrine
  getAll(): Promise<{ categories: Category[]; items: MenuItem[]; settings?: MenuSettings }> {
    return http.get<{ categories: Category[]; items: MenuItem[]; settings?: MenuSettings }>('/menu').then((r) => r.data);
  },
};

export const pedidosApi = {
  create(d: {
    customerName: string;
    // tableId (mesa identificada via QR Code) tem prioridade sobre tableNumber
    // (entrada manual, legado — assume tipo "Mesa").
    tableId?: string;
    tableNumber?: string;
    items: { menuItemId: string; quantity: number; notes?: string; selectedOptionIds?: string[] }[];
  }): Promise<Comanda> {
    // A API (vps-api/backend) espera "qty", não "quantity" — só a camada de API
    // traduz; o resto do app usa "quantity" internamente.
    const payload = {
      customerName: d.customerName,
      tableId: d.tableId,
      tableNumber: d.tableId ? undefined : d.tableNumber,
      items: d.items.map((i) => ({
        menuItemId: i.menuItemId,
        qty: i.quantity,
        notes: i.notes,
        selectedOptionIds: i.selectedOptionIds,
      })),
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
      selectedOptionIds: i.selectedOptionIds,
    }));
    return http.post<Comanda>(`/pedidos/${token}/items`, { items: payload }).then((r) => r.data);
  },
};
