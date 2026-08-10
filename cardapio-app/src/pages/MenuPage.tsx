import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { menuApi } from '../lib/api';
import { pedidosApi } from '../lib/api';
import type { Category, MenuItem } from '../lib/types';
import { addToCart, getCart, clearCart, cartCount } from '../lib/cart';
import { getSession, setSession } from '../lib/session';
import ProdutoCard from '../components/ProdutoCard';
import CartDrawer from '../components/CartDrawer';
import IdentModal from '../components/IdentModal';

function formatPrice(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function MenuPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [identModalOpen, setIdentModalOpen] = useState(false);
  const [cartVersion, setCartVersion] = useState(0);

  const cartItems = getCart();
  const count = cartCount(cartItems);

  const bumpCart = useCallback(() => setCartVersion((v) => v + 1), []);

  useEffect(() => {
    menuApi
      .getAll()
      .then(({ categories: cats, items: its }) => {
        const sorted = [...cats].sort((a, b) => a.sortOrder - b.sortOrder);
        setCategories(sorted);
        setItems(its);
        if (sorted.length > 0) setActiveCategory(sorted[0].id);
      })
      .catch(() => setError('Não foi possível carregar o cardápio. Verifique sua conexão.'))
      .finally(() => setLoading(false));
  }, []);

  function handleAdd(item: MenuItem) {
    addToCart({ menuItemId: item.id, name: item.name, price: item.price, quantity: 1 });
    bumpCart();
  }

  async function handleConfirmOrder(customerName: string, tableNumber: string) {
    const cart = getCart();
    const payload = cart.map((c) => ({
      menuItemId: c.menuItemId,
      quantity: c.quantity,
      notes: c.notes,
    }));
    const comanda = await pedidosApi.create({ customerName, tableNumber, items: payload });
    setSession({ token: comanda.token, customerName, tableNumber });
    clearCart();
    bumpCart();
    setIdentModalOpen(false);
    setCartDrawerOpen(false);
    navigate('/comanda');
  }

  async function handleAddToExisting() {
    const session = getSession();
    if (!session) return;
    const cart = getCart();
    await pedidosApi.addItems(session.token, cart);
    clearCart();
    bumpCart();
    setCartDrawerOpen(false);
    navigate('/comanda');
  }

  const filtered = items.filter(
    (i) => !activeCategory || i.categoryId === activeCategory || i.category === activeCategory
  );

  const wrapStyle: React.CSSProperties = {
    maxWidth: 480,
    margin: '0 auto',
    minHeight: '100vh',
    background: '#f4f6f8',
    display: 'flex',
    flexDirection: 'column',
  };

  const headerStyle: React.CSSProperties = {
    background: '#0D1B2A',
    padding: '20px 16px 16px',
    position: 'sticky',
    top: 0,
    zIndex: 50,
  };

  const logoStyle: React.CSSProperties = {
    fontSize: 26,
    fontWeight: 900,
    color: '#FFD60A',
    letterSpacing: 1,
    lineHeight: 1,
  };

  const taglineStyle: React.CSSProperties = {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
  };

  const tabsWrapStyle: React.CSSProperties = {
    background: '#0D1B2A',
    paddingBottom: 12,
    position: 'sticky',
    top: 72,
    zIndex: 49,
  };

  const tabsInnerStyle: React.CSSProperties = {
    display: 'flex',
    gap: 6,
    overflowX: 'auto',
    padding: '0 16px',
    scrollbarWidth: 'none',
  };

  const contentStyle: React.CSSProperties = {
    flex: 1,
    padding: '16px 16px 100px',
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 12,
  };

  const fabStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 76,
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#FF6B2B',
    color: '#fff',
    border: 'none',
    borderRadius: 24,
    padding: '14px 24px',
    fontSize: 15,
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(255,107,43,0.4)',
    whiteSpace: 'nowrap',
    zIndex: 60,
    display: count > 0 ? 'block' : 'none',
  };

  const errorStyle: React.CSSProperties = {
    margin: 20,
    padding: 16,
    background: '#fff0f0',
    border: '1px solid #E63946',
    borderRadius: 10,
    color: '#E63946',
    fontSize: 14,
    fontWeight: 600,
    textAlign: 'center',
  };

  const loadingStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: 12,
    color: '#666',
    padding: 40,
  };

  return (
    <div style={wrapStyle}>
      <div style={headerStyle}>
        <div style={logoStyle}>BODOGAMI</div>
        <div style={taglineStyle}>Cardápio Digital</div>
      </div>

      {categories.length > 0 && (
        <div style={tabsWrapStyle}>
          <div style={tabsInnerStyle}>
            {categories.map((cat) => {
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  style={{
                    flexShrink: 0,
                    padding: '7px 16px',
                    borderRadius: 20,
                    border: 'none',
                    background: active ? '#FFD60A' : 'rgba(255,255,255,0.1)',
                    color: active ? '#0D1B2A' : 'rgba(255,255,255,0.8)',
                    fontSize: 13,
                    fontWeight: active ? 800 : 500,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div style={contentStyle}>
        {loading && (
          <div style={loadingStyle}>
            <span style={{ fontSize: 36 }}>🍣</span>
            <span style={{ fontSize: 15, fontWeight: 600 }}>Carregando cardápio...</span>
          </div>
        )}

        {!loading && error && <div style={errorStyle}>{error}</div>}

        {!loading && !error && filtered.length === 0 && (
          <div style={loadingStyle}>
            <span style={{ fontSize: 36 }}>🍽️</span>
            <span style={{ fontSize: 15, fontWeight: 600 }}>Nenhum item nesta categoria</span>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div style={gridStyle}>
            {filtered
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((item) => (
                <ProdutoCard key={item.id} item={item} onAdd={handleAdd} />
              ))}
          </div>
        )}
      </div>

      <button
        style={fabStyle}
        onClick={() => setCartDrawerOpen(true)}
        aria-label="Ver carrinho"
      >
        Ver carrinho ({count} {count === 1 ? 'item' : 'itens'})
      </button>

      <CartDrawer
        open={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
        onOrder={() => {
          setCartDrawerOpen(false);
          setIdentModalOpen(true);
        }}
        onAddToExisting={handleAddToExisting}
        cartVersion={cartVersion}
        onCartChange={bumpCart}
      />

      <IdentModal
        open={identModalOpen}
        onClose={() => setIdentModalOpen(false)}
        onConfirm={handleConfirmOrder}
      />
    </div>
  );
}
