import React from 'react';

interface Props {
  quantity: number;
  onDecrease: () => void;
  onIncrease: () => void;
  min?: number;
}

export default function QuantityControl({ quantity, onDecrease, onIncrease, min = 1 }: Props) {
  const btnBase: React.CSSProperties = {
    width: 32,
    height: 32,
    borderRadius: '50%',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    fontWeight: 700,
    cursor: 'pointer',
    userSelect: 'none',
    flexShrink: 0,
    lineHeight: 1,
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button
        onClick={onDecrease}
        disabled={quantity <= min}
        style={{
          ...btnBase,
          background: quantity <= min ? '#e0e0e0' : '#FF6B2B',
          color: quantity <= min ? '#aaa' : '#fff',
        }}
        aria-label="Diminuir quantidade"
      >
        −
      </button>
      <span style={{ minWidth: 20, textAlign: 'center', fontWeight: 700, fontSize: 16 }}>
        {quantity}
      </span>
      <button
        onClick={onIncrease}
        style={{ ...btnBase, background: '#2DC653', color: '#fff' }}
        aria-label="Aumentar quantidade"
      >
        +
      </button>
    </div>
  );
}
