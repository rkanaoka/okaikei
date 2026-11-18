import React from 'react';
import type { MenuItem } from '../lib/types';
import { C, FONT, RADIUS, SHADOW, formatPrice } from '../theme';
import FoodImage from './FoodImage';
import { IconPlus } from './Icons';
import { FavoriteButton, Rating } from './Showcase';

interface Props {
  item: MenuItem;
  categoryName?: string;
  /** Quantidade já no carrinho — mostrada como selo no botão de adicionar. */
  inCart?: number;
  rating?: { rating: number; reviews: number } | null;
  /** undefined = favoritos desligados no admin (não mostra o coração). */
  favorite?: { active: boolean; onToggle: () => void };
  onAdd: (item: MenuItem) => void;
  onOpenDetail: (item: MenuItem) => void;
}

export default function ProdutoCard({ item, categoryName, inCart = 0, rating, favorite, onAdd, onOpenDetail }: Props) {
  const hasOptions = (item.optionGroups?.length ?? 0) > 0;

  function handleQuickAdd(e: React.MouseEvent) {
    e.stopPropagation();
    if (!item.available) return;
    // Item com grupos de opções sempre passa pela tela de detalhes antes do carrinho.
    if (hasOptions) onOpenDetail(item);
    else onAdd(item);
  }

  return (
    <article
      onClick={() => onOpenDetail(item)}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenDetail(item);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${item.name}, ${formatPrice(item.price)}${item.available ? '' : ', indisponível'}`}
      style={{
        background: C.surface,
        borderRadius: RADIUS.md,
        boxShadow: SHADOW.card,
        padding: '14px 12px 14px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        cursor: 'pointer',
        fontFamily: FONT,
        minWidth: 0,
      }}
    >
      {favorite && (
        <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 1 }}>
          <FavoriteButton active={favorite.active} onToggle={favorite.onToggle} label={item.name} />
        </div>
      )}

      <div style={{ position: 'relative', alignSelf: 'center', margin: '6px 0 12px', opacity: item.available ? 1 : 0.45 }}>
        <FoodImage src={item.imageUrl} alt={item.name} hint={[categoryName, item.description]} size={112} />
        <button
          type="button"
          onClick={handleQuickAdd}
          disabled={!item.available}
          aria-label={hasOptions ? `Escolher opções de ${item.name}` : `Adicionar ${item.name} ao carrinho`}
          style={{
            position: 'absolute',
            right: -6,
            bottom: -2,
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: '3px solid #fff',
            background: item.available ? C.primary : '#D9D9D9',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: item.available ? 'pointer' : 'not-allowed',
            boxShadow: item.available ? SHADOW.button : 'none',
          }}
        >
          <IconPlus size={18} strokeWidth={2.6} />
          {inCart > 0 && (
            <span
              aria-label={`${inCart} no carrinho`}
              style={{
                position: 'absolute',
                top: -8,
                right: -8,
                minWidth: 18,
                height: 18,
                padding: '0 4px',
                borderRadius: 9,
                background: C.text,
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #fff',
              }}
            >
              {inCart > 9 ? '9+' : inCart}
            </span>
          )}
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: rating?.reviews ? 'space-between' : 'flex-end', gap: 6, marginBottom: 2 }}>
        <Rating value={rating} />
        <span style={{ fontSize: 15, fontWeight: 600, color: C.primary, whiteSpace: 'nowrap' }}>{formatPrice(item.price)}</span>
      </div>
      <h4
        style={{
          margin: 0,
          fontSize: 14,
          fontWeight: 600,
          color: C.text,
          lineHeight: 1.35,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {item.name}
      </h4>
      {item.description && (
        <p
          style={{
            margin: '4px 0 0',
            fontSize: 12,
            color: C.textMuted,
            lineHeight: 1.45,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {item.description}
        </p>
      )}
      {!item.available && (
        <span
          style={{
            marginTop: 8,
            alignSelf: 'flex-start',
            fontSize: 11,
            fontWeight: 600,
            color: C.textMuted,
            background: '#F1F1F1',
            borderRadius: RADIUS.pill,
            padding: '3px 10px',
          }}
        >
          Indisponível
        </span>
      )}
      {hasOptions && item.available && (
        <span style={{ marginTop: 8, fontSize: 11, color: C.textMuted }}>Personalizável</span>
      )}
    </article>
  );
}
