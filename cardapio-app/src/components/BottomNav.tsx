import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../lib/CartContext';
import { APP_MAX_WIDTH, C, FONT, RADIUS, SHADOW } from '../theme';
import { IconCart, IconHeart, IconHome, IconReceipt } from './Icons';

/** Altura útil da barra (sem a área segura do iPhone) — usada pelas páginas para o espaçamento inferior. */
export const BOTTOM_NAV_HEIGHT = 68;

interface TabProps {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: (color: string, active: boolean) => React.ReactNode;
  badge?: number;
}

function Tab({ label, active, onClick, icon, badge = 0 }: TabProps) {
  const color = active ? C.primary : '#9A9A9A';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={badge > 0 ? `${label}, ${badge} ${badge === 1 ? 'item' : 'itens'}` : label}
      aria-current={active ? 'page' : undefined}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        height: 42,
        padding: active ? '0 18px 0 14px' : '0 14px',
        borderRadius: RADIUS.pill,
        border: 'none',
        background: active ? C.primarySoft : 'transparent',
        color,
        fontFamily: FONT,
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'background 0.2s, padding 0.2s',
      }}
    >
      {icon(color, active)}
      {active && <span>{label}</span>}
      {badge > 0 && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 2,
            left: 26,
            minWidth: 18,
            height: 18,
            padding: '0 4px',
            borderRadius: 9,
            background: C.primary,
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #fff',
          }}
        >
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  );
}

export default function BottomNav({ hasSession, showFavorites }: { hasSession: boolean; showFavorites: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const cart = useCart();

  return (
    <nav
      aria-label="Navegação principal"
      style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: APP_MAX_WIDTH,
        height: `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom))`,
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: C.surface,
        borderRadius: '24px 24px 0 0',
        boxShadow: SHADOW.floating,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 90,
      }}
    >
      <Tab
        label="Cardápio"
        active={location.pathname === '/' && !cart.isOpen}
        onClick={() => navigate('/')}
        icon={(color, active) => <IconHome size={22} color={color} filled={active} />}
      />
      {showFavorites && (
        <Tab
          label="Favoritos"
          active={location.pathname === '/favoritos' && !cart.isOpen}
          onClick={() => navigate('/favoritos')}
          icon={(color, active) => <IconHeart size={22} color={color} filled={active} />}
        />
      )}
      <Tab
        label="Carrinho"
        active={cart.isOpen}
        onClick={cart.open}
        badge={cart.count}
        icon={(color) => <IconCart size={22} color={color} />}
      />
      {hasSession && (
        <Tab
          label="Meu pedido"
          active={location.pathname === '/comanda' && !cart.isOpen}
          onClick={() => navigate('/comanda')}
          icon={(color, active) => <IconReceipt size={22} color={color} filled={active} />}
        />
      )}
    </nav>
  );
}
