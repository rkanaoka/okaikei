import React, { useState, useEffect } from 'react';
import type { QrTable } from '../lib/qrTable';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (customerName: string, tableNumber: string) => Promise<void>;
  qrTable?: QrTable | null;
}

export default function IdentModal({ open, onClose, onConfirm, qrTable }: Props) {
  const [customerName, setCustomerName] = useState('');
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
      setError('Por favor, informe seu nome.');
      return;
    }
    if (!qrTable && (!tableNumber.trim() || isNaN(Number(tableNumber)))) {
      setError('Por favor, informe um número de mesa válido.');
      return;
    }
    setLoading(true);
    try {
      // Mesa já identificada pelo QR Code — o valor real (tableId) é resolvido
      // por App.tsx a partir da sessão; aqui só confirmamos o nome.
      await onConfirm(customerName.trim(), tableNumber.trim());
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Erro ao enviar pedido. Tente novamente.';
      setError(msg);
      setLoading(false);
    }
  }

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(13,27,42,0.6)',
    zIndex: 200,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
  };

  const panelStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: '20px 20px 0 0',
    width: '100%',
    maxWidth: 480,
    padding: '28px 20px 40px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 20,
    fontWeight: 800,
    color: '#0D1B2A',
    textAlign: 'center',
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginTop: -8,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: '#0D1B2A',
    marginBottom: 4,
    display: 'block',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    fontSize: 16,
    border: '1.5px solid #ddd',
    borderRadius: 10,
    outline: 'none',
    color: '#0D1B2A',
    background: '#fafafa',
  };

  const errorStyle: React.CSSProperties = {
    background: '#fff0f0',
    border: '1px solid #E63946',
    borderRadius: 8,
    padding: '10px 14px',
    color: '#E63946',
    fontSize: 13,
    fontWeight: 600,
  };

  const confirmBtnStyle: React.CSSProperties = {
    background: loading ? '#aaa' : '#FFD60A',
    color: '#0D1B2A',
    border: 'none',
    borderRadius: 12,
    padding: '16px 0',
    fontSize: 16,
    fontWeight: 800,
    cursor: loading ? 'not-allowed' : 'pointer',
    width: '100%',
    letterSpacing: 0.3,
  };

  const cancelBtnStyle: React.CSSProperties = {
    background: 'transparent',
    color: '#666',
    border: 'none',
    fontSize: 14,
    cursor: 'pointer',
    padding: '8px 0',
    textAlign: 'center',
    width: '100%',
  };

  return (
    <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && !loading && onClose()}>
      <div style={panelStyle}>
        <div style={titleStyle}>Identificação</div>
        <div style={subtitleStyle}>Precisamos saber quem você é e onde está sentado</div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle} htmlFor="customerName">
              Seu nome
            </label>
            <input
              id="customerName"
              style={inputStyle}
              type="text"
              placeholder="Ex: João Silva"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              disabled={loading}
              autoFocus
              autoComplete="name"
            />
          </div>

          {qrTable ? (
            <div>
              <label style={labelStyle}>Mesa</label>
              <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', gap: 8, background: '#f0f7ff', borderColor: '#0D1B2A' }}>
                <span>✓</span>
                <span style={{ fontWeight: 700 }}>{qrTable.label || 'Identificada pelo QR Code'}</span>
              </div>
            </div>
          ) : (
            <div>
              <label style={labelStyle} htmlFor="tableNumber">
                Número da mesa
              </label>
              <input
                id="tableNumber"
                style={inputStyle}
                type="number"
                inputMode="numeric"
                placeholder="Ex: 5"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                disabled={loading}
                min="1"
              />
            </div>
          )}

          {error && <div style={errorStyle}>{error}</div>}

          <button type="submit" style={confirmBtnStyle} disabled={loading}>
            {loading ? 'Enviando pedido...' : 'Confirmar pedido →'}
          </button>
        </form>

        <button style={cancelBtnStyle} onClick={onClose} disabled={loading}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
