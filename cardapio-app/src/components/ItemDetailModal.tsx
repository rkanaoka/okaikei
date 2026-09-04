import React, { useEffect, useState } from 'react';
import type { MenuItem } from '../lib/types';

interface Props {
  item: MenuItem | null;
  onClose: () => void;
  onAdd: (item: MenuItem, notes: string, selectedOptionIds: string[], unitPrice: number) => void;
}

function formatPrice(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function ItemDetailModal({ item, onClose, onAdd }: Props) {
  const [selections, setSelections] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const initial: Record<string, string[]> = {};
    (item?.optionGroups ?? []).forEach((g) => {
      initial[g.id] = [];
    });
    setSelections(initial);
  }, [item?.id]);

  if (!item) return null;

  function toggleOption(groupId: string, optionId: string, maxSelect: number) {
    setSelections((prev) => {
      const current = prev[groupId] ?? [];
      if (current.includes(optionId)) return { ...prev, [groupId]: current.filter((i) => i !== optionId) };
      if (maxSelect === 1) return { ...prev, [groupId]: [optionId] };
      if (current.length >= maxSelect) return prev;
      return { ...prev, [groupId]: [...current, optionId] };
    });
  }

  const groups = item.optionGroups ?? [];
  const isValid = groups.every((g) => (selections[g.id]?.length ?? 0) >= g.minSelect);

  const optionsTotal = groups.reduce((sum, g) => {
    const selectedIds = selections[g.id] ?? [];
    const groupSum = selectedIds.reduce((s, oid) => s + (g.options.find((o) => o.id === oid)?.price ?? 0), 0);
    return sum + groupSum;
  }, 0);
  const unitPrice = item.price + optionsTotal;

  function buildNotes(): string {
    const parts: string[] = [];
    for (const g of groups) {
      const selectedIds = selections[g.id] ?? [];
      if (!selectedIds.length) continue;
      const names = selectedIds
        .map((oid) => g.options.find((o) => o.id === oid)?.name)
        .filter(Boolean) as string[];
      if (names.length) parts.push(`${g.name}: ${names.join(', ')}`);
    }
    return parts.join('; ');
  }

  function handleConfirm() {
    if (!item || !isValid) return;
    const selectedOptionIds = Object.values(selections).flat();
    onAdd(item, buildNotes(), selectedOptionIds, unitPrice);
  }

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(13,27,42,0.6)',
    zIndex: 150,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
  };

  const panelStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: '20px 20px 0 0',
    width: '100%',
    maxWidth: 480,
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
  };

  const imgWrapStyle: React.CSSProperties = {
    width: '100%',
    height: 180,
    background: '#f0f0f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
    borderRadius: '20px 20px 0 0',
    position: 'relative',
  };

  const closeBtnStyle: React.CSSProperties = {
    position: 'absolute',
    top: 12,
    right: 12,
    background: 'rgba(13,27,42,0.6)',
    border: 'none',
    borderRadius: '50%',
    width: 32,
    height: 32,
    fontSize: 18,
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const scrollStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: '20px 20px 8px',
  };

  const nameStyle: React.CSSProperties = {
    fontSize: 19,
    fontWeight: 800,
    color: '#0D1B2A',
    lineHeight: 1.3,
  };

  const priceStyle: React.CSSProperties = {
    fontSize: 17,
    fontWeight: 800,
    color: '#FF6B2B',
    marginTop: 4,
  };

  const descStyle: React.CSSProperties = {
    fontSize: 13,
    color: '#555',
    lineHeight: 1.6,
    marginTop: 12,
  };

  const groupWrapStyle: React.CSSProperties = {
    marginTop: 22,
  };

  const groupTitleStyle: React.CSSProperties = {
    fontWeight: 700,
    fontSize: 14,
    color: '#0D1B2A',
  };

  const groupHintStyle: React.CSSProperties = {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
    marginBottom: 8,
  };

  const optionsRowStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  };

  const footerStyle: React.CSSProperties = {
    padding: '14px 20px 28px',
    borderTop: '1px solid #f0f0f0',
    flexShrink: 0,
  };

  const confirmBtnStyle: React.CSSProperties = {
    background: item.available && isValid ? '#FFD60A' : '#eee',
    color: item.available && isValid ? '#0D1B2A' : '#aaa',
    border: 'none',
    borderRadius: 12,
    padding: '15px 0',
    fontSize: 15,
    fontWeight: 800,
    cursor: item.available && isValid ? 'pointer' : 'not-allowed',
    width: '100%',
  };

  return (
    <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={panelStyle}>
        <div style={imgWrapStyle}>
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ fontSize: 56 }}>🍱</span>
          )}
          <button style={closeBtnStyle} onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>

        <div style={scrollStyle}>
          <div style={nameStyle}>{item.name}</div>
          <div style={priceStyle}>{formatPrice(unitPrice)}</div>
          {item.description && <div style={descStyle}>{item.description}</div>}
          {!item.available && (
            <div style={{ ...descStyle, color: '#E63946', fontWeight: 700, marginTop: 10 }}>
              Item indisponível no momento
            </div>
          )}

          {groups.map((g) => {
            const selected = selections[g.id] ?? [];
            return (
              <div key={g.id} style={groupWrapStyle}>
                <div style={groupTitleStyle}>
                  {g.name}
                  {g.minSelect > 0 && <span style={{ color: '#E63946' }}> *</span>}
                </div>
                <div style={groupHintStyle}>
                  {g.minSelect === g.maxSelect
                    ? `Escolha ${g.minSelect}`
                    : g.minSelect > 0
                    ? `Escolha de ${g.minSelect} a ${g.maxSelect}`
                    : `Escolha até ${g.maxSelect}`}
                </div>
                <div style={optionsRowStyle}>
                  {g.options.map((o) => {
                    const isSel = selected.includes(o.id);
                    const atCap = !isSel && g.maxSelect > 1 && selected.length >= g.maxSelect;
                    return (
                      <button
                        key={o.id}
                        type="button"
                        disabled={atCap}
                        onClick={() => toggleOption(g.id, o.id, g.maxSelect)}
                        style={{
                          padding: '8px 14px',
                          borderRadius: 999,
                          border: `1.5px solid ${isSel ? '#FF6B2B' : '#ddd'}`,
                          background: isSel ? '#FF6B2B' : '#fff',
                          color: isSel ? '#fff' : '#0D1B2A',
                          fontWeight: 700,
                          fontSize: 13,
                          cursor: atCap ? 'default' : 'pointer',
                          opacity: atCap ? 0.4 : 1,
                        }}
                      >
                        {o.name}
                        {o.price > 0 && ` (+${formatPrice(o.price)})`}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div style={footerStyle}>
          <button style={confirmBtnStyle} disabled={!item.available || !isValid} onClick={handleConfirm}>
            Adicionar ao carrinho
          </button>
        </div>
      </div>
    </div>
  );
}
