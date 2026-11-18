import React, { useEffect, useState } from 'react';
import { useCart } from '../lib/CartContext';
import { getSession, tableDisplay } from '../lib/session';
import { APP_MAX_WIDTH, C, FONT, RADIUS, SHADOW, formatPrice } from '../theme';
import QuantityControl from './QuantityControl';
import FoodImage from './FoodImage';
import { IconBag, IconClose, IconTrash } from './Icons';

interface Props {
  /** Sem comanda aberta: segue para a identificação (nome + mesa). */
  onOrder: () => void;
  /** Com comanda aberta: envia os itens direto para ela. */
  onAddToExisting: () => Promise<void>;
}

export default function CartDrawer({ onOrder, onAddToExisting }: Props) {
  const cart = useCart();
  const session = getSession();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [editingNote, setEditingNote] = useState<string | null>(null);

  useEffect(() => {
    if (!cart.isOpen) { setError(''); setEditingNote(null); }
  }, [cart.isOpen]);

  // Fecha com Esc e trava a rolagem do fundo
  useEffect(() => {
    if (!cart.isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape' && !sending) cart.close(); }
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [cart.isOpen, sending]);

  if (!cart.isOpen) return null;

  async function handlePrimary() {
    if (cart.count === 0 || sending) return;
    if (!session) { onOrder(); return; }
    setSending(true);
    setError('');
    try {
      await onAddToExisting();
    } catch {
      setError('Não foi possível enviar os itens. Tente novamente.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Carrinho"
      onClick={(e) => e.target === e.currentTarget && !sending && cart.close()}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(31,31,31,0.45)',
        zIndex: 120,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        fontFamily: FONT,
        animation: 'bdg-fade 0.18s ease-out',
      }}
    >
      <div
        style={{
          background: C.bg,
          borderRadius: '26px 26px 0 0',
          width: '100%',
          maxWidth: APP_MAX_WIDTH,
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          animation: 'bdg-slide-up 0.22s ease-out',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }} aria-hidden="true">
          <span style={{ width: 44, height: 5, borderRadius: 3, background: '#DADADA' }} />
        </div>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px 12px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: C.text }}>Seu carrinho</h2>
            {cart.count > 0 && (
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                {cart.count} {cart.count === 1 ? 'item' : 'itens'}
                {session ? ` · vai para a comanda${session.tableNumber ? ` da ${tableDisplay(session.tableNumber)}` : ''}` : ''}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={cart.close}
            disabled={sending}
            aria-label="Fechar carrinho"
            style={{ width: 38, height: 38, borderRadius: 12, border: 'none', background: C.surface, boxShadow: SHADOW.card, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.text }}
          >
            <IconClose size={18} strokeWidth={2.2} />
          </button>
        </header>

        {cart.items.length === 0 ? (
          <div style={{ padding: '36px 20px 48px', textAlign: 'center', color: C.textMuted }}>
            <div style={{ fontSize: 48, marginBottom: 8 }} aria-hidden="true">🛒</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: C.text }}>Seu carrinho está vazio</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Toque no + dos pratos para adicionar.</div>
            <button
              type="button"
              onClick={cart.close}
              style={{ marginTop: 20, border: 'none', borderRadius: RADIUS.pill, background: C.primary, color: '#fff', padding: '12px 26px', fontFamily: FONT, fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: SHADOW.button }}
            >
              Ver cardápio
            </button>
          </div>
        ) : (
          <>
            <ul style={{ listStyle: 'none', margin: 0, flex: 1, overflowY: 'auto', padding: '4px 16px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {cart.items.map((item) => (
                <li key={item.id} style={{ background: C.surface, borderRadius: RADIUS.md, boxShadow: SHADOW.card, padding: 12 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <FoodImage src={item.imageUrl} alt={item.name} size={58} shadow={false} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: C.text, lineHeight: 1.3 }}>{item.name}</span>
                        <button
                          type="button"
                          onClick={() => cart.remove(item.id)}
                          aria-label={`Remover ${item.name}`}
                          style={{ border: 'none', background: 'none', padding: 2, color: '#B5B5B5', cursor: 'pointer', flexShrink: 0, height: 24 }}
                        >
                          <IconTrash size={18} />
                        </button>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, gap: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 600, color: C.primary }}>
                          {formatPrice(item.price * item.quantity)}
                        </span>
                        <QuantityControl
                          size="sm"
                          quantity={item.quantity}
                          label={item.name}
                          onDecrease={() => cart.updateQty(item.id, item.quantity - 1)}
                          onIncrease={() => cart.updateQty(item.id, item.quantity + 1)}
                        />
                      </div>
                    </div>
                  </div>
                  {editingNote === item.id ? (
                    <textarea
                      autoFocus
                      rows={2}
                      maxLength={200}
                      value={item.notes ?? ''}
                      placeholder="Ex.: sem cebolinha, molho à parte…"
                      onChange={(e) => cart.setNotes(item.id, e.target.value)}
                      onBlur={() => setEditingNote(null)}
                      aria-label={`Observação para ${item.name}`}
                      style={{
                        width: '100%',
                        marginTop: 10,
                        padding: '10px 12px',
                        fontFamily: FONT,
                        fontSize: 16,
                        border: `1.5px solid ${C.primary}`,
                        borderRadius: 12,
                        outline: 'none',
                        resize: 'none',
                        color: C.text,
                        background: '#FFFBF9',
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingNote(item.id)}
                      style={{
                        marginTop: 10,
                        width: '100%',
                        textAlign: 'left',
                        border: 'none',
                        borderTop: `1px dashed ${C.border}`,
                        background: 'none',
                        padding: '8px 0 0',
                        fontFamily: FONT,
                        fontSize: 12,
                        color: item.notes ? C.text : C.primary,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.notes ? `📝 ${item.notes}` : '+ Adicionar observação'}
                    </button>
                  )}
                </li>
              ))}
            </ul>

            <footer style={{ padding: '14px 20px calc(18px + env(safe-area-inset-bottom))', background: C.surface, borderRadius: '22px 22px 0 0', boxShadow: SHADOW.floating }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
                <span style={{ fontSize: 15, color: C.textMuted }}>Total</span>
                <span style={{ fontSize: 22, fontWeight: 600, color: C.text }}>{formatPrice(cart.total)}</span>
              </div>
              {error && (
                <div role="alert" style={{ background: '#FDECEC', color: C.danger, borderRadius: 12, padding: '10px 14px', fontSize: 13, marginBottom: 12 }}>
                  {error}
                </div>
              )}
              <button
                type="button"
                onClick={handlePrimary}
                disabled={sending}
                style={{
                  width: '100%',
                  height: 56,
                  border: 'none',
                  borderRadius: RADIUS.pill,
                  background: sending ? '#FFB49C' : C.primary,
                  color: '#fff',
                  boxShadow: SHADOW.button,
                  fontFamily: FONT,
                  fontSize: 16,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  cursor: sending ? 'wait' : 'pointer',
                }}
              >
                <IconBag size={20} strokeWidth={2} />
                {sending ? 'Enviando…' : session ? 'Enviar para minha comanda' : 'Fazer pedido'}
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
