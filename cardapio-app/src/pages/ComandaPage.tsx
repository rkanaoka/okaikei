import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { pedidosApi } from '../lib/api';
import type { Comanda } from '../lib/types';
import { getSession, clearSession } from '../lib/session';
import { getCart, clearCart, cartCount } from '../lib/cart';
import CartDrawer from '../components/CartDrawer';

const POLL_INTERVAL = 15_000;

function formatPrice(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function statusLabel(status: string): { icon: string; text: string; color: string } {
  switch (status.toUpperCase()) {
    case 'SENT':
    case 'IN_PROGRESS':
    case 'PREPARING':
      return { icon: '🍳', text: 'Em preparo', color: '#FF6B2B' };
    case 'READY':
    case 'DONE':
      return { icon: '✅', text: 'Pronto', color: '#2DC653' };
    case 'CANCELLED':
      return { icon: '✖', text: 'Cancelado', color: '#E63946' };
    default:
      return { icon: '⏳', text: 'Aguardando', color: '#999' };
  }
}

function comandaStatusLabel(status: string): { text: string; color: string } {
  switch (status.toUpperCase()) {
    case 'OPEN':
      return { text: 'Em aberto', color: '#2DC653' };
    case 'CLOSED':
      return { text: 'Fechada', color: '#E63946' };
    case 'PAID':
      return { text: 'Paga', color: '#0D1B2A' };
    default:
      return { text: status, color: '#666' };
  }
}

export default function ComandaPage() {
  const navigate = useNavigate();
  const session = getSession();
  const [comanda, setComanda] = useState<Comanda | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [cartVersion, setCartVersion] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cartItems = getCart();
  const cartQty = cartCount(cartItems);

  const bumpCart = useCallback(() => setCartVersion((v) => v + 1), []);

  const fetchComanda = useCallback(async () => {
    if (!session) return;
    try {
      const data = await pedidosApi.get(session.token);
      setComanda(data);
      setError('');
    } catch {
      setError('Não foi possível atualizar o pedido.');
    } finally {
      setLoading(false);
    }
  }, [session?.token]);

  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }
    fetchComanda();
    intervalRef.current = setInterval(fetchComanda, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchComanda]);

  async function handleAddToExisting() {
    if (!session) return;
    const cart = getCart();
    try {
      await pedidosApi.addItems(session.token, cart);
      clearCart();
      bumpCart();
      setCartDrawerOpen(false);
      await fetchComanda();
    } catch {
      setError('Erro ao adicionar itens. Tente novamente.');
    }
  }

  function handleClearSession() {
    clearSession();
    clearCart();
    navigate('/');
  }

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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  const logoStyle: React.CSSProperties = {
    fontSize: 22,
    fontWeight: 900,
    color: '#FFD60A',
    letterSpacing: 1,
  };

  const newOrderBtnStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.1)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: '6px 14px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  };

  const contentStyle: React.CSSProperties = {
    flex: 1,
    padding: '16px 16px 100px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  };

  const infoCardStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: 12,
    padding: '16px',
    boxShadow: '0 2px 8px rgba(13,27,42,0.07)',
  };

  const infoRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 700,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  };

  const itemsCardStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: 12,
    padding: '16px',
    boxShadow: '0 2px 8px rgba(13,27,42,0.07)',
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  };

  const totalCardStyle: React.CSSProperties = {
    background: '#0D1B2A',
    borderRadius: 12,
    padding: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const emptyStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 40,
    color: '#666',
    textAlign: 'center',
  };

  const loadingStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    color: '#666',
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
    zIndex: 60,
    whiteSpace: 'nowrap',
    display: cartQty > 0 ? 'block' : 'none',
  };

  return (
    <div style={wrapStyle}>
      <div style={headerStyle}>
        <div>
          <div style={logoStyle}>BODOGAMI</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
            Acompanhar pedido
          </div>
        </div>
        {session && (
          <button style={newOrderBtnStyle} onClick={handleClearSession}>
            Novo pedido
          </button>
        )}
      </div>

      <div style={contentStyle}>
        {!session && (
          <div style={emptyStyle}>
            <span style={{ fontSize: 48 }}>🍽️</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#0D1B2A' }}>
              Nenhum pedido ativo
            </span>
            <span style={{ fontSize: 14 }}>
              Acesse o cardápio, adicione itens e faça seu pedido.
            </span>
            <button
              style={{
                marginTop: 8,
                background: '#FFD60A',
                color: '#0D1B2A',
                border: 'none',
                borderRadius: 12,
                padding: '14px 28px',
                fontSize: 15,
                fontWeight: 800,
                cursor: 'pointer',
              }}
              onClick={() => navigate('/')}
            >
              Ver cardápio
            </button>
          </div>
        )}

        {session && loading && (
          <div style={loadingStyle}>
            <span style={{ fontSize: 36 }}>🔄</span>
            <span style={{ fontSize: 15, fontWeight: 600 }}>Buscando seu pedido...</span>
          </div>
        )}

        {session && !loading && error && (
          <div
            style={{
              margin: '0',
              padding: 14,
              background: '#fff0f0',
              border: '1px solid #E63946',
              borderRadius: 10,
              color: '#E63946',
              fontSize: 13,
              fontWeight: 600,
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}

        {session && !loading && comanda && (
          <>
            {/* Info card */}
            <div style={infoCardStyle}>
              <div style={{ ...infoRowStyle, marginBottom: 10 }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#0D1B2A' }}>
                  Olá, {comanda.customerName}!
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 20,
                    background: `${comandaStatusLabel(comanda.status).color}20`,
                    color: comandaStatusLabel(comanda.status).color,
                  }}
                >
                  {comandaStatusLabel(comanda.status).text}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 11, color: '#aaa', fontWeight: 600 }}>MESA</span>
                  <span style={{ fontSize: 20, fontWeight: 900, color: '#0D1B2A' }}>
                    {comanda.tableNumber}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 11, color: '#aaa', fontWeight: 600 }}>ITENS</span>
                  <span style={{ fontSize: 20, fontWeight: 900, color: '#0D1B2A' }}>
                    {comanda.items.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Items list */}
            <div style={itemsCardStyle}>
              <div style={sectionTitleStyle}>Itens do pedido</div>
              {comanda.items.map((item, idx) => {
                const s = statusLabel(item.status);
                const cancelled = item.status.toUpperCase() === 'CANCELLED';
                return (
                  <div
                    key={item.id ?? idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 0',
                      borderBottom:
                        idx < comanda.items.length - 1 ? '1px solid #f4f4f4' : 'none',
                      opacity: cancelled ? 0.5 : 1,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 3,
                        flex: 1,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: '#0D1B2A',
                          textDecoration: cancelled ? 'line-through' : 'none',
                        }}
                      >
                        {item.quantity}x {item.name}
                      </span>
                      {item.notes && (
                        <span style={{ fontSize: 11, color: '#999' }}>Obs: {item.notes}</span>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 13 }}>{s.icon}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: s.color }}>
                          {s.text}
                        </span>
                      </div>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#0D1B2A' }}>
                      {formatPrice(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Total */}
            <div style={totalCardStyle}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Total</span>
              <span style={{ fontSize: 22, fontWeight: 900, color: '#FFD60A' }}>
                {formatPrice(comanda.total)}
              </span>
            </div>

            {/* Add more button */}
            <button
              style={{
                background: 'transparent',
                color: '#FF6B2B',
                border: '2px solid #FF6B2B',
                borderRadius: 12,
                padding: '14px 0',
                fontSize: 15,
                fontWeight: 800,
                cursor: 'pointer',
                width: '100%',
              }}
              onClick={() => navigate('/')}
            >
              + Pedir mais itens
            </button>

            <div style={{ fontSize: 11, color: '#bbb', textAlign: 'center' }}>
              Atualizado automaticamente a cada 15 segundos
            </div>
          </>
        )}
      </div>

      <button
        style={fabStyle}
        onClick={() => setCartDrawerOpen(true)}
        aria-label="Ver carrinho"
      >
        Adicionar ao pedido ({cartQty})
      </button>

      <CartDrawer
        open={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
        onOrder={() => {}}
        onAddToExisting={handleAddToExisting}
        cartVersion={cartVersion}
        onCartChange={bumpCart}
      />
    </div>
  );
}
