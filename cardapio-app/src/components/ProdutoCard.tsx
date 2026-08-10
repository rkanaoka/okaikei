import React from 'react';
import type { MenuItem } from '../lib/types';

interface Props {
  item: MenuItem;
  onAdd: (item: MenuItem) => void;
}

function formatPrice(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function ProdutoCard({ item, onAdd }: Props) {
  const cardStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 2px 8px rgba(13,27,42,0.08)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    opacity: item.available ? 1 : 0.55,
  };

  const imgContainerStyle: React.CSSProperties = {
    width: '100%',
    height: 120,
    background: '#f0f0f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  };

  const bodyStyle: React.CSSProperties = {
    padding: '10px 12px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    flex: 1,
  };

  const nameStyle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 700,
    color: '#0D1B2A',
    lineHeight: 1.3,
  };

  const descStyle: React.CSSProperties = {
    fontSize: 12,
    color: '#666',
    lineHeight: 1.4,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  };

  const footerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
    paddingTop: 8,
  };

  const priceStyle: React.CSSProperties = {
    fontSize: 15,
    fontWeight: 800,
    color: '#0D1B2A',
  };

  const addBtnStyle: React.CSSProperties = {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: item.available ? '#2DC653' : '#ccc',
    color: '#fff',
    border: 'none',
    fontSize: 22,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: item.available ? 'pointer' : 'not-allowed',
    lineHeight: 1,
    flexShrink: 0,
  };

  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    background: 'rgba(255,255,255,0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  };

  const unavailableLabelStyle: React.CSSProperties = {
    background: '#555',
    color: '#fff',
    fontSize: 11,
    fontWeight: 700,
    padding: '4px 10px',
    borderRadius: 20,
    letterSpacing: 0.5,
  };

  return (
    <div style={cardStyle}>
      <div style={imgContainerStyle}>
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span style={{ fontSize: 40 }}>🍱</span>
        )}
      </div>

      <div style={bodyStyle}>
        <span style={nameStyle}>{item.name}</span>
        {item.description && <span style={descStyle}>{item.description}</span>}
        <div style={footerStyle}>
          <span style={priceStyle}>{formatPrice(item.price)}</span>
          <button
            style={addBtnStyle}
            disabled={!item.available}
            onClick={() => item.available && onAdd(item)}
            aria-label={`Adicionar ${item.name}`}
          >
            +
          </button>
        </div>
      </div>

      {!item.available && (
        <div style={overlayStyle}>
          <span style={unavailableLabelStyle}>Indisponível</span>
        </div>
      )}
    </div>
  );
}
