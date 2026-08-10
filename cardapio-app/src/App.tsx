import React, { useCallback, useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import MenuPage from './pages/MenuPage';
import ComandaPage from './pages/ComandaPage';
import CartDrawer from './components/CartDrawer';
import { getSession, setSession, clearSession } from './lib/session';
import { getCart, clearCart, cartCount } from './lib/cart';
import { pedidosApi } from './lib/api';
import IdentModal from './components/IdentModal';

function BottomBar({
  onCartClick,
  cartCount: count,
  hasSession,
}: {
  onCartClick: () => void;
  cartCount: number;
  hasSession: boolean;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const isMenu = location.pathname === '/';
  const isComanda = location.pathname === '/comanda';

  const barStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: 480,
    background: '#0D1B2A',
    display: 'flex',
    alignItems: 'center',
    justifyContent: hasSession ? 'space-around' : 'space-around',
    padding: '10px 0 calc(10px + env(safe-area-inset-bottom))',
    zIndex: 90,
    borderTop: '1px solid rgba(255,255,255,0.08)',
  };

  const tabBtnStyle = (active: boolean): React.CSSProperties => ({
    background: 'transparent',
    border: 'none',
    color: active ? '#FFD60A' : 'rgba(255,255,255,0.5)',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
    padding: '4px 16px',
    fontSize: 10,
    fontWeight: active ? 700 : 500,
    letterSpacing: 0.3,
  });

  const iconStyle: React.CSSProperties = {
    fontSize: 22,
    lineHeight: 1,
  };

  const cartBtnStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
    padding: '4px 16px',
    position: 'relative',
  };

  const badgeStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    right: 10,
    background: '#E63946',
    color: '#fff',
    borderRadius: '50%',
    width: 16,
    height: 16,
    fontSize: 10,
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  };

  return (
    <div style={barStyle}>
      <button style={tabBtnStyle(isMenu)} onClick={() => navigate('/')}>
        <span style={iconStyle}>🍣</span>
        <span>Cardápio</span>
      </button>

      <button style={cartBtnStyle} onClick={onCartClick} aria-label="Carrinho">
        <span
          style={{
            ...iconStyle,
            color: count > 0 ? '#FFD60A' : 'rgba(255,255,255,0.5)',
          }}
        >
          🛒
        </span>
        {count > 0 && <span style={badgeStyle}>{count > 9 ? '9+' : count}</span>}
        <span
          style={{
            fontSize: 10,
            color: count > 0 ? '#FFD60A' : 'rgba(255,255,255,0.5)',
            fontWeight: count > 0 ? 700 : 500,
          }}
        >
          Carrinho
        </span>
      </button>

      {hasSession && (
        <button style={tabBtnStyle(isComanda)} onClick={() => navigate('/comanda')}>
          <span style={iconStyle}>📋</span>
          <span>Comanda</span>
        </button>
      )}
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [identModalOpen, setIdentModalOpen] = useState(false);
  const [cartVersion, setCartVersion] = useState(0);

  const bumpCart = useCallback(() => setCartVersion((v) => v + 1), []);

  const session = getSession();
  const cartItems = getCart();
  const count = cartCount(cartItems);

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
    const s = getSession();
    if (!s) return;
    const cart = getCart();
    await pedidosApi.addItems(s.token, cart);
    clearCart();
    bumpCart();
    setCartDrawerOpen(false);
    navigate('/comanda');
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<MenuPage />} />
        <Route path="/comanda" element={<ComandaPage />} />
      </Routes>

      <BottomBar
        onCartClick={() => setCartDrawerOpen(true)}
        cartCount={count}
        hasSession={!!session}
      />

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
    </>
  );
}
