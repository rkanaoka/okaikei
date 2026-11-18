// Estado do carrinho compartilhado por todas as telas. A persistência continua em
// localStorage (lib/cart.ts); o contexto só garante que qualquer alteração
// re-renderize juntos o selo da barra inferior, o botão flutuante e a gaveta.
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { CartItem } from './types';
import * as store from './cart';

interface CartContextValue {
  items: CartItem[];
  count: number;
  total: number;
  add: (item: Omit<CartItem, 'id'>) => void;
  updateQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  setNotes: (id: string, notes: string) => void;
  clear: () => void;
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => store.getCart());
  const [isOpen, setIsOpen] = useState(false);

  const sync = useCallback(() => setItems(store.getCart()), []);

  const add = useCallback((item: Omit<CartItem, 'id'>) => { store.addToCart(item); sync(); }, [sync]);
  const updateQty = useCallback((id: string, qty: number) => { store.updateQty(id, qty); sync(); }, [sync]);
  const remove = useCallback((id: string) => { store.removeFromCart(id); sync(); }, [sync]);
  const clear = useCallback(() => { store.clearCart(); sync(); }, [sync]);
  const setNotes = useCallback((id: string, notes: string) => {
    store.setCart(store.getCart().map((c) => (c.id === id ? { ...c, notes } : c)));
    sync();
  }, [sync]);

  const value = useMemo<CartContextValue>(() => ({
    items,
    count: store.cartCount(items),
    total: store.cartTotal(items),
    add,
    updateQty,
    remove,
    setNotes,
    clear,
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  }), [items, add, updateQty, remove, setNotes, clear, isOpen]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart precisa estar dentro de <CartProvider>');
  return ctx;
}
