import type { CartItem } from './types';

const KEY = 'bdg_cart';

export function getCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function setCart(items: CartItem[]): void {
  localStorage.setItem(KEY, JSON.stringify(items));
}

function genId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

// Duas linhas são "o mesmo item" (e somam quantidade) apenas se tiverem as
// mesmas observações/customizações — do contrário, itens iguais mas com
// seleções de opções diferentes viram linhas distintas no carrinho.
export function addToCart(item: Omit<CartItem, 'id'>): void {
  const cart = getCart();
  const existing = cart.find(
    (c) => c.menuItemId === item.menuItemId && (c.notes || '') === (item.notes || '')
  );
  if (existing) {
    existing.quantity += item.quantity;
  } else {
    cart.push({ ...item, id: genId() });
  }
  setCart(cart);
}

export function removeFromCart(id: string): void {
  setCart(getCart().filter((c) => c.id !== id));
}

export function updateQty(id: string, qty: number): void {
  if (qty <= 0) {
    removeFromCart(id);
    return;
  }
  const cart = getCart();
  const item = cart.find((c) => c.id === id);
  if (item) {
    item.quantity = qty;
    setCart(cart);
  }
}

export function clearCart(): void {
  localStorage.removeItem(KEY);
}

export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}
