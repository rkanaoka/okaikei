import React, { useState, useEffect } from 'react';
import type { CartItem } from '../lib/types';
import { getCart, setCart, removeFromCart, updateQty, cartTotal, cartCount } from '../lib/cart';
import { getSession } from '../lib/session';
import QuantityControl from './QuantityControl';

function formatPrice(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

interface Props {
  open: boolean;
  onClose: () => void;
  onOrder: () => void;
  onAddToExisting: () => void;
  cartVersion: number;
  onCartChange: () => void;
}

export default function CartDrawer({
  open,
  onClose,
  onOrder,
  onAddToExisting,
  cartVersion,
  onCartChange,
}: Props) {
  const [cart, setCartState] = useState<CartItem[]>([]);
  const session = getSession();

  useEffect(() => {
    setCartState(getCart());
  }, [open, cartVersion]);

  function handleRemove(menuItemId: string) {
    removeFromCart(menuItemId);
    const updated = getCart();
    setCartState(updated);
    onCartChange();
  }

  function handleQty(menuItemId: string, qty: number) {
    updateQty(menuItemId, qty);
    const updated = getCart();
    setCartState(updated);
    onCartChange();
  }

  function handleNoteChange(menuItemId: string, note: string) {
    const updated = cart.map((c) =>
      c.menuItemId === menuItemId ? { ...c, notes: note } : c
    );
    setCartState(updated);
    setCart(updated);
  }

  if (!open) return null;

  const total = cartTotal(cart);
  const count = cartCount(cart);

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(13,27,42,0.5)',
    zIndex: 100,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
  };

  const drawerStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: '20px 20px 0 0',
    width: '100%',
    maxWidth: 480,
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
  };

  const headerStyle: React.CSSProperties = {
    padding: '16px 20px 12px',
    borderBottom: '1px solid #f0f0f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 18,
    fontWeight: 800,
    color: '#0D1B2A',
  };

  const closeBtnStyle: React.CSSProperties = {
    background: '#f0f0f0',
    border: 'none',
    borderRadius: '50%',
    width: 32,
    height: 32,
    fontSize: 18,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#0D1B2A',
  };

  const listStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: '12px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  };

  const itemRowStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: '12px 0',
    borderBottom: '1px solid #f4f4f4',
  };

  const itemTopStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  };

  const itemNameStyle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 700,
    color: '#0D1B2A',
    flex: 1,
  };

  const itemPriceStyle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 700,
    color: '#FF6B2B',
    whiteSpace: 'nowrap',
  };

  const removeBtnStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: '#E63946',
    fontSize: 18,
    cursor: 'pointer',
    padding: '0 4px',
    lineHeight: 1,
  };

  const noteInputStyle: React.CSSProperties = {
    width: '100%',
    padding: '6px 10px',
    fontSize: 12,
    border: '1px solid #e0e0e0',
    borderRadius: 8,
    color: '#555',
    background: '#fafafa',
    outline: 'none',
    resize: 'none',
  };

  const footerStyle: React.CSSProperties = {
    padding: '12px 20px 28px',
    borderTop: '1px solid #f0f0f0',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    flexShrink: 0,
  };

  const totalRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const totalLabelStyle: React.CSSProperties = {
    fontSize: 16,
    fontWeight: 700,
    color: '#0D1B2A',
  };

  const totalValueStyle: React.CSSProperties = {
    fontSize: 20,
    fontWeight: 900,
    color: '#0D1B2A',
  };

  const primaryBtnStyle: React.CSSProperties = {
    background: '#FFD60A',
    color: '#0D1B2A',
    border: 'none',
    borderRadius: 12,
    padding: '15px 0',
    fontSize: 15,
    fontWeight: 800,
    cursor: count > 0 ? 'pointer' : 'not-allowed',
    opacity: count > 0 ? 1 : 0.5,
    width: '100%',
  };

  const emptyStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 40,
    color: '#999',
  };

  return (
    <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={drawerStyle}>
        <div style={headerStyle}>
          <span style={titleStyle}>Carrinho</span>
          <button style={closeBtnStyle} onClick={onClose} aria-label="Fechar carrinho">
            ×
          </button>
        </div>

        {cart.length === 0 ? (
          <div style={emptyStyle}>
            <span style={{ fontSize: 48 }}>🛒</span>
            <span style={{ fontSize: 15, fontWeight: 600 }}>Carrinho vazio</span>
            <span style={{ fontSize: 13 }}>Adicione itens do cardápio</span>
          </div>
        ) : (
          <div style={listStyle}>
            {cart.map((item) => (
              <div key={item.menuItemId} style={itemRowStyle}>
                <div style={itemTopStyle}>
                  <span style={itemNameStyle}>{item.name}</span>
                  <span style={itemPriceStyle}>
                    {formatPrice(item.price * item.quantity)}
                  </span>
                  <button
                    style={removeBtnStyle}
                    onClick={() => handleRemove(item.menuItemId)}
                    aria-label={`Remover ${item.name}`}
                  >
                    ×
                  </button>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <QuantityControl
                    quantity={item.quantity}
                    onDecrease={() => handleQty(item.menuItemId, item.quantity - 1)}
                    onIncrease={() => handleQty(item.menuItemId, item.quantity + 1)}
                    min={1}
                  />
                  <span style={{ fontSize: 12, color: '#aaa' }}>
                    {formatPrice(item.price)} / un
                  </span>
                </div>
                <textarea
                  style={noteInputStyle}
                  placeholder="Observação (opcional)"
                  rows={1}
                  value={item.notes ?? ''}
                  onChange={(e) => handleNoteChange(item.menuItemId, e.target.value)}
                />
              </div>
            ))}
          </div>
        )}

        <div style={footerStyle}>
          <div style={totalRowStyle}>
            <span style={totalLabelStyle}>Total</span>
            <span style={totalValueStyle}>{formatPrice(total)}</span>
          </div>

          {session ? (
            <button
              style={{ ...primaryBtnStyle, background: '#FF6B2B', color: '#fff' }}
              disabled={count === 0}
              onClick={count > 0 ? onAddToExisting : undefined}
            >
              Adicionar ao pedido ({count} {count === 1 ? 'item' : 'itens'})
            </button>
          ) : (
            <button
              style={primaryBtnStyle}
              disabled={count === 0}
              onClick={count > 0 ? onOrder : undefined}
            >
              Fazer pedido → ({count} {count === 1 ? 'item' : 'itens'})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
