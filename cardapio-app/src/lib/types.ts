export interface Category {
  id: string;
  name: string;
  sortOrder: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  categoryId?: string;
  imageUrl?: string;
  available: boolean;
  sortOrder: number;
}

export interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

export interface Session {
  token: string;
  customerName: string;
  tableNumber: string;
}

export interface ComandaItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  status: string;
  notes?: string;
}

export interface Comanda {
  token: string;
  customerName: string;
  tableNumber: string;
  status: string;
  items: ComandaItem[];
  total: number;
}
