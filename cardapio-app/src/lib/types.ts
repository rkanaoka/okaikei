export interface Category {
  id: string;
  name: string;
  sortOrder: number;
}

export interface MenuOption {
  id: string;
  name: string;
  price: number;
}

export interface OptionGroup {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  options: MenuOption[];
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
  optionGroups?: OptionGroup[];
}

export interface CartItem {
  // Identificador único da linha no carrinho — não é o menuItemId, pois o
  // mesmo item pode aparecer em várias linhas com customizações diferentes.
  id: string;
  menuItemId: string;
  name: string;
  // Preço unitário já somado com as opções selecionadas (se houver) — o
  // backend recalcula e valida isso de novo a partir de selectedOptionIds,
  // este valor é só para exibição/preview no carrinho.
  price: number;
  quantity: number;
  notes?: string;
  selectedOptionIds?: string[];
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
