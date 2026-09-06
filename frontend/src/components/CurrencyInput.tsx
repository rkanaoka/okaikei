import React from 'react';

// Aceita dígitos e um único separador decimal (',' ou '.'), normalizado para
// '.' internamente — o resto do app já espera Number()/parseFloat() em '.'.
// Limita a 2 casas decimais e descarta qualquer caractere que não seja
// dígito ou separador (inclusive '-', então valores negativos nunca chegam
// a ser digitados).
export function sanitizeCurrencyInput(raw: string): string {
  let v = raw.replace(',', '.').replace(/[^0-9.]/g, '');
  const firstDot = v.indexOf('.');
  if (firstDot !== -1) {
    const intPart = v.slice(0, firstDot);
    const decPart = v.slice(firstDot + 1).replace(/\./g, '').slice(0, 2);
    v = `${intPart}.${decPart}`;
  }
  return v;
}

interface CurrencyInputProps {
  value: string;
  onChange: (value: string) => void;
  style?: React.CSSProperties;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  id?: string;
}

// Campo de valor em R$: seleciona tudo ao focar (para sobrescrever
// digitando), aceita ',' ou '.' como separador decimal, e arredonda para
// 2 casas ao sair do campo.
export default function CurrencyInput({ value, onChange, style, placeholder, autoFocus, disabled, id }: CurrencyInputProps) {
  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      value={value}
      disabled={disabled}
      autoFocus={autoFocus}
      placeholder={placeholder}
      onFocus={(e) => e.target.select()}
      onChange={(e) => onChange(sanitizeCurrencyInput(e.target.value))}
      onBlur={(e) => {
        const n = parseFloat(e.target.value);
        if (!isNaN(n)) onChange(n.toFixed(2));
      }}
      style={style}
    />
  );
}
