import React from 'react';
import { C, FONT } from '../theme';
import { IconMinus, IconPlus } from './Icons';

interface Props {
  quantity: number;
  onDecrease: () => void;
  onIncrease: () => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md';
  /** Rótulo do item para leitores de tela ("Diminuir quantidade de X"). */
  label?: string;
}

export default function QuantityControl({
  quantity, onDecrease, onIncrease, min = 1, max = 99, size = 'md', label,
}: Props) {
  const box = size === 'sm' ? 28 : 32;
  const canDecrease = quantity > min;
  const canIncrease = quantity < max;

  const btn = (enabled: boolean): React.CSSProperties => ({
    width: box,
    height: box,
    borderRadius: 8,
    border: 'none',
    background: enabled ? C.primary : '#F1F1F1',
    color: enabled ? '#fff' : '#BDBDBD',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: enabled ? 'pointer' : 'default',
    boxShadow: enabled ? '0 4px 10px rgba(255,114,71,0.3)' : 'none',
    flexShrink: 0,
    transition: 'background 0.15s',
  });

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <button
        type="button"
        onClick={onDecrease}
        disabled={!canDecrease}
        style={btn(canDecrease)}
        aria-label={label ? `Diminuir quantidade de ${label}` : 'Diminuir quantidade'}
      >
        <IconMinus size={size === 'sm' ? 14 : 16} strokeWidth={2.4} />
      </button>
      <span
        aria-live="polite"
        style={{
          minWidth: size === 'sm' ? 28 : 36,
          textAlign: 'center',
          fontFamily: FONT,
          fontWeight: 600,
          fontSize: size === 'sm' ? 14 : 16,
          color: C.text,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {String(quantity).padStart(2, '0')}
      </span>
      <button
        type="button"
        onClick={onIncrease}
        disabled={!canIncrease}
        style={btn(canIncrease)}
        aria-label={label ? `Aumentar quantidade de ${label}` : 'Aumentar quantidade'}
      >
        <IconPlus size={size === 'sm' ? 14 : 16} strokeWidth={2.4} />
      </button>
    </div>
  );
}
