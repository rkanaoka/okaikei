import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { pedidosApi } from '../lib/api';
import type { Comanda } from '../lib/types';
import { getSession, clearSession, tableDisplay } from '../lib/session';
import { useCart } from '../lib/CartContext';
import { APP_MAX_WIDTH, C, FONT, PAGE_BACKGROUND, RADIUS, SHADOW, formatPrice, iconButton } from '../theme';
import { BOTTOM_NAV_HEIGHT } from '../components/BottomNav';
import FoodImage from '../components/FoodImage';
import { IconBack, IconPlus, IconRefresh } from '../components/Icons';

const POLL_INTERVAL = 15_000;

function itemStatus(status: string): { text: string; color: string; bg: string } {
  switch (status.toUpperCase()) {
    case 'SENT':
    case 'IN_PROGRESS':
    case 'PREPARING':
      return { text: 'Em preparo', color: '#C2410C', bg: '#FFEDD5' };
    case 'READY':
    case 'DONE':
      return { text: 'Pronto', color: '#15803D', bg: '#DCFCE7' };
    case 'DELIVERED':
      return { text: 'Entregue', color: '#475569', bg: '#F1F5F9' };
    case 'CANCELLED':
      return { text: 'Cancelado', color: C.danger, bg: '#FDECEC' };
    default:
      return { text: 'Recebido', color: '#6B6B6B', bg: '#F1F1F1' };
  }
}

function comandaStatus(status: string): { text: string; color: string; bg: string } {
  switch (status.toUpperCase()) {
    case 'OPEN':
    case 'PREPARING':
      return { text: 'Em aberto', color: '#15803D', bg: '#DCFCE7' };
    case 'CLOSED':
    case 'PAID':
      return { text: 'Fechada', color: '#475569', bg: '#F1F5F9' };
    case 'CANCELLED':
      return { text: 'Cancelada', color: C.danger, bg: '#FDECEC' };
    default:
      return { text: status, color: '#6B6B6B', bg: '#F1F1F1' };
  }
}

function Chip({ text, color, bg }: { text: string; color: string; bg: string }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color, background: bg, borderRadius: RADIUS.pill, padding: '4px 10px', whiteSpace: 'nowrap' }}>
      {text}
    </span>
  );
}

export default function ComandaPage() {
  const navigate = useNavigate();
  const cart = useCart();
  const session = getSession();
  const [comanda, setComanda] = useState<Comanda | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchComanda = useCallback(async () => {
    if (!session) return;
    setRefreshing(true);
    try {
      const data = await pedidosApi.get(session.token);
      setComanda(data);
      setUpdatedAt(new Date());
      setError('');
    } catch {
      setError('Não foi possível atualizar o pedido. Vamos tentar de novo em instantes.');
    } finally {
      setLoading(false);
      setRefreshing(false);
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

  function handleNewOrder() {
    if (!window.confirm('Começar um novo pedido? Você deixará de acompanhar este pedido neste aparelho.')) return;
    clearSession();
    cart.clear();
    navigate('/');
  }

  const card: React.CSSProperties = { background: C.surface, borderRadius: RADIUS.md, boxShadow: SHADOW.card, padding: 16 };
  const activeItems = comanda?.items.filter((i) => i.status.toUpperCase() !== 'CANCELLED').length ?? 0;

  return (
    <div
      style={{
        maxWidth: APP_MAX_WIDTH,
        margin: '0 auto',
        minHeight: '100vh',
        background: PAGE_BACKGROUND,
        fontFamily: FONT,
        paddingBottom: BOTTOM_NAV_HEIGHT + 24,
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'calc(14px + env(safe-area-inset-top)) 16px 10px' }}>
        <button type="button" style={iconButton} onClick={() => navigate('/')} aria-label="Voltar ao cardápio">
          <IconBack size={20} strokeWidth={2.2} />
        </button>
        <h1 style={{ margin: 0, fontSize: 16, fontWeight: 500, color: C.text }}>Meu pedido</h1>
        <button
          type="button"
          style={{ ...iconButton, visibility: session ? 'visible' : 'hidden' }}
          onClick={fetchComanda}
          disabled={refreshing}
          aria-label="Atualizar pedido"
        >
          <span style={{ display: 'flex', animation: refreshing ? 'bdg-spin 0.8s linear infinite' : 'none' }}>
            <IconRefresh size={19} />
          </span>
        </button>
      </header>

      <main style={{ padding: '8px 16px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {!session && (
          <div style={{ ...card, textAlign: 'center', padding: '36px 20px', marginTop: 24 }}>
            <div style={{ fontSize: 48, marginBottom: 8 }} aria-hidden="true">🍽️</div>
            <div style={{ fontSize: 17, fontWeight: 600, color: C.text }}>Nenhum pedido em andamento</div>
            <div style={{ fontSize: 14, color: C.textMuted, marginTop: 6 }}>Escolha seus pratos no cardápio e faça seu pedido.</div>
            <button
              type="button"
              onClick={() => navigate('/')}
              style={{ marginTop: 20, border: 'none', borderRadius: RADIUS.pill, background: C.primary, color: '#fff', padding: '14px 28px', fontFamily: FONT, fontSize: 15, fontWeight: 600, cursor: 'pointer', boxShadow: SHADOW.button }}
            >
              Ver cardápio
            </button>
          </div>
        )}

        {session && loading && (
          <div role="status" style={{ textAlign: 'center', padding: 60, color: C.textMuted }}>
            <span
              aria-hidden="true"
              style={{ display: 'inline-block', width: 30, height: 30, borderRadius: '50%', border: `3px solid ${C.primarySoft}`, borderTopColor: C.primary, animation: 'bdg-spin 0.8s linear infinite' }}
            />
            <div style={{ marginTop: 12, fontSize: 14 }}>Buscando seu pedido…</div>
          </div>
        )}

        {session && !loading && error && (
          <div role="alert" style={{ background: '#FDECEC', color: C.danger, borderRadius: 12, padding: '12px 14px', fontSize: 13 }}>
            {error}
          </div>
        )}

        {session && !loading && comanda && (
          <>
            {/* Saudação + mesa */}
            <section
              style={{
                borderRadius: RADIUS.lg,
                padding: '20px 18px',
                color: '#fff',
                background: `linear-gradient(135deg, ${C.primary} 0%, #FF9A6C 100%)`,
                boxShadow: SHADOW.button,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <span
                aria-hidden="true"
                style={{ position: 'absolute', right: -30, bottom: -40, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,0.14)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 13, opacity: 0.9 }}>Olá,</div>
                  <div style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.2 }}>{comanda.customerName}! 👋</div>
                </div>
                <span style={{ background: 'rgba(255,255,255,0.22)', borderRadius: RADIUS.pill, padding: '5px 12px', fontSize: 12, fontWeight: 600 }}>
                  {comandaStatus(comanda.status).text}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 28, marginTop: 18, position: 'relative' }}>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.85, textTransform: 'uppercase', letterSpacing: 0.6 }}>Mesa</div>
                  <div style={{ fontSize: 20, fontWeight: 600 }}>{tableDisplay(comanda.tableNumber).replace(/^Mesa\s+/i, '') || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, opacity: 0.85, textTransform: 'uppercase', letterSpacing: 0.6 }}>Itens</div>
                  <div style={{ fontSize: 20, fontWeight: 600 }}>{activeItems}</div>
                </div>
              </div>
            </section>

            {/* Itens com status de preparo */}
            <section style={card} aria-label="Itens do pedido">
              <h2 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 600, color: C.text }}>Itens do pedido</h2>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {comanda.items.map((item, idx) => {
                  const s = itemStatus(item.status);
                  const cancelled = item.status.toUpperCase() === 'CANCELLED';
                  return (
                    <li
                      key={item.id ?? idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '12px 0',
                        borderBottom: idx < comanda.items.length - 1 ? `1px solid ${C.border}` : 'none',
                        opacity: cancelled ? 0.55 : 1,
                      }}
                    >
                      <FoodImage alt={item.name} size={46} shadow={false} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, textDecoration: cancelled ? 'line-through' : 'none' }}>
                          {item.quantity}× {item.name}
                        </div>
                        {item.notes && (
                          <div
                            title={item.notes}
                            style={{ fontSize: 12, color: C.textMuted, marginTop: 2, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                          >
                            {item.notes}
                          </div>
                        )}
                        <div style={{ marginTop: 6 }}><Chip {...s} /></div>
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: C.text, whiteSpace: 'nowrap' }}>
                        {formatPrice(item.unitPrice * item.quantity)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 15, color: C.textMuted }}>Total</span>
              <span style={{ fontSize: 22, fontWeight: 600, color: C.primary }}>{formatPrice(comanda.total)}</span>
            </section>

            <button
              type="button"
              onClick={() => navigate('/')}
              style={{
                height: 54,
                border: 'none',
                borderRadius: RADIUS.pill,
                background: C.surface,
                color: C.primary,
                boxShadow: SHADOW.card,
                fontFamily: FONT,
                fontSize: 15,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                cursor: 'pointer',
              }}
            >
              <IconPlus size={18} strokeWidth={2.4} /> Pedir mais itens
            </button>

            <div style={{ textAlign: 'center', fontSize: 12, color: C.textMuted }}>
              Atualiza sozinho a cada 15 segundos
              {updatedAt && ` · última às ${updatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
            </div>

            <button
              type="button"
              onClick={handleNewOrder}
              style={{ alignSelf: 'center', border: 'none', background: 'none', fontFamily: FONT, fontSize: 13, color: C.textMuted, textDecoration: 'underline', cursor: 'pointer', padding: 8 }}
            >
              Começar um novo pedido
            </button>
          </>
        )}
      </main>
    </div>
  );
}
