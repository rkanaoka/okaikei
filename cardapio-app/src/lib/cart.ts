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

export function addToCart(item: CartItem): void {
  const cart = getCart();
  const existing = cart.find((c) => c.menuItemId === item.menuItemId);
  if (existing) {
    existing.quantity += item.quantity;
  } else {
    cart.push({ ...item });
  }
  setCart(cart);
}

export function removeFromCart(menuItemId: string): void {
  setCart(getCart().filter((c) => c.menuItemId !== menuItemId));
}

export function updateQty(menuItemId: string, qty: number): void {
  if (qty <= 0) {
    removeFromCart(menuItemId);
    return;
  }
  const cart = getCart();
  const item = cart.find((c) => c.menuItemId === menuItemId);
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
