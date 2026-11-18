import React, { useEffect, useState } from 'react';
import type { QrTable } from '../lib/qrTable';
import { APP_MAX_WIDTH, C, FONT, RADIUS, SHADOW, formatPrice } from '../theme';
import { IconBag, IconTable } from './Icons';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (customerName: string, tableNumber: string) => Promise<void>;
  qrTable?: QrTable | null;
  /** Resumo exibido acima do botão ("3 itens · R$ 120,00"). */
  itemCount: number;
  total: number;
}

const NAME_KEY = 'bdg_last_name';

export default function IdentModal({ open, onClose, onConfirm, qrTable, itemCount, total }: Props) {
  // Lembra o nome do último pedido neste aparelho — evita redigitar a cada visita
  const [customerName, setCustomerName] = useState(() => {
    try { return localStorage.getItem(NAME_KEY) ?? ''; } catch { return ''; }
  });
  const [tableNumber, setTableNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setError('');
      setLoading(false);
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!customerName.trim()) {
      setError('Informe seu nome para chamarmos você.');
      return;
    }
    if (!qrTable && (!tableNumber.trim() || isNaN(Number(tableNumber)))) {
      setError('Informe o número da sua mesa.');
      return;
    }
    setLoading(true);
    try {
      try { localStorage.setItem(NAME_KEY, customerName.trim()); } catch { /* armazenamento indisponível */ }
      // Mesa identificada pelo QR Code: o tableId é resolvido no App a partir da sessão
      await onConfirm(customerName.trim(), tableNumber.trim());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar pedido. Tente novamente.');
      setLoading(false);
    }
  }

  const label: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 6, display: 'block' };
  const input: React.CSSProperties = {
    width: '100%',
    height: 52,
    padding: '0 16px',
    fontFamily: FONT,
    fontSize: 16, // ≥16px evita zoom automático no iOS
    border: `1.5px solid ${C.border}`,
    borderRadius: 14,
    outline: 'none',
    color: C.text,
    background: C.surface,
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ident-title"
      onClick={(e) => e.target === e.currentTarget && !loading && onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(31,31,31,0.45)',
        zIndex: 200,
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
          padding: '12px 20px calc(24px + env(safe-area-inset-bottom))',
          animation: 'bdg-slide-up 0.22s ease-out',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }} aria-hidden="true">
          <span style={{ width: 44, height: 5, borderRadius: 3, background: '#DADADA' }} />
        </div>
        <h2 id="ident-title" style={{ margin: 0, fontSize: 21, fontWeight: 600, color: C.text, textAlign: 'center' }}>
          Quase lá! 👋
        </h2>
        <p style={{ margin: '6px 0 20px', fontSize: 14, color: C.textMuted, textAlign: 'center' }}>
          Só precisamos saber quem é você e onde está sentado.
        </p>

        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={label} htmlFor="customerName">Seu nome</label>
            <input
              id="customerName"
              style={input}
              type="text"
              placeholder="Ex.: João"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              onFocus={(e) => (e.currentTarget.style.borderColor = C.primary)}
              onBlur={(e) => (e.currentTarget.style.borderColor = C.border)}
              disabled={loading}
              autoFocus={!customerName}
              autoComplete="given-name"
              enterKeyHint={qrTable ? 'send' : 'next'}
              maxLength={60}
            />
          </div>

          {qrTable ? (
            <div>
              <span style={label}>Mesa</span>
              <div
                style={{
                  ...input,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: C.primarySoft,
                  borderColor: 'transparent',
                  color: C.primaryDark,
                  fontWeight: 600,
                }}
              >
                <IconTable size={20} />
                {qrTable.label || 'Identificada pelo QR Code'}
                <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 500 }}>✓ via QR Code</span>
              </div>
            </div>
          ) : (
            <div>
              <label style={label} htmlFor="tableNumber">Número da mesa</label>
              <input
                id="tableNumber"
                style={input}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Ex.: 5"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value.replace(/\D/g, ''))}
                onFocus={(e) => (e.currentTarget.style.borderColor = C.primary)}
                onBlur={(e) => (e.currentTarget.style.borderColor = C.border)}
                disabled={loading}
                enterKeyHint="send"
                maxLength={4}
              />
            </div>
          )}

          {error && (
            <div role="alert" style={{ background: '#FDECEC', color: C.danger, borderRadius: 12, padding: '10px 14px', fontSize: 13 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              height: 56,
              marginTop: 4,
              border: 'none',
              borderRadius: RADIUS.pill,
              background: loading ? '#FFB49C' : C.primary,
              color: '#fff',
              boxShadow: SHADOW.button,
              fontFamily: FONT,
              fontSize: 16,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            <IconBag size={20} strokeWidth={2} />
            {loading ? 'Enviando pedido…' : `Confirmar pedido · ${formatPrice(total)}`}
          </button>
          <div style={{ textAlign: 'center', fontSize: 12, color: C.textMuted, marginTop: -6 }}>
            {itemCount} {itemCount === 1 ? 'item' : 'itens'} no pedido
          </div>
        </form>

        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          style={{ width: '100%', marginTop: 8, padding: '10px 0', border: 'none', background: 'none', fontFamily: FONT, fontSize: 14, color: C.textMuted, cursor: 'pointer' }}
        >
          Voltar ao carrinho
        </button>
      </div>
    </div>
  );
}
