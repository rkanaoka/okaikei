// Peças da vitrine do cardápio (configuradas em Admin > Cardápio > Cardápio digital):
// nota, botão de favorito, banner de ofertas e faixa de destaques.
import React, { useEffect, useRef, useState } from 'react';
import type { MenuItem, MenuOffer } from '../lib/types';
import { C, FONT, RADIUS, SHADOW, formatPrice } from '../theme';
import FoodImage from './FoodImage';
import { IconHeart, IconStar } from './Icons';

// ── Nota ─────────────────────────────────────────────────────────────────────

export function Rating({ value, size = 'sm' }: { value?: { rating: number; reviews: number } | null; size?: 'sm' | 'md' }) {
  if (!value || value.reviews <= 0) return null;
  const fs = size === 'md' ? 13 : 12;
  return (
    <span
      aria-label={`Nota ${value.rating.toLocaleString('pt-BR')} de 5, ${value.reviews} avaliações`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: fs, color: C.textMuted, fontFamily: FONT }}
    >
      <IconStar size={fs + 2} color={C.star} />
      <span style={{ color: C.text, fontWeight: 500 }}>{value.rating.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}</span>
      {size === 'md' ? `(${value.reviews} avaliações)` : `(${value.reviews})`}
    </span>
  );
}

// ── Favorito ─────────────────────────────────────────────────────────────────

export function FavoriteButton({
  active, onToggle, label, variant = 'card',
}: { active: boolean; onToggle: () => void; label: string; variant?: 'card' | 'header' }) {
  const [pop, setPop] = useState(false);
  const header = variant === 'header';
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? `Remover ${label} dos favoritos` : `Adicionar ${label} aos favoritos`}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
        setPop(true);
        window.setTimeout(() => setPop(false), 220);
      }}
      style={{
        width: header ? 42 : 32,
        height: header ? 42 : 32,
        borderRadius: header ? 12 : '50%',
        border: 'none',
        background: header ? C.surface : 'rgba(255,255,255,0.92)',
        boxShadow: SHADOW.card,
        color: active ? C.primary : '#9A9A9A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        flexShrink: 0,
        transform: pop ? 'scale(1.18)' : 'scale(1)',
        transition: 'transform 0.18s ease-out, color 0.15s',
      }}
    >
      <IconHeart size={header ? 22 : 18} filled={active} color={active ? C.primary : '#9A9A9A'} strokeWidth={2} />
    </button>
  );
}

// ── Banner de ofertas (carrossel com scroll-snap) ─────────────────────────────

export function OffersCarousel({
  title, offers, itemsById, onOpenItem,
}: {
  title: string;
  offers: MenuOffer[];
  itemsById: Map<string, MenuItem>;
  onOpenItem: (item: MenuItem) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  // Indicador de página acompanha a rolagem manual
  function onScroll() {
    const el = trackRef.current;
    if (!el) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

  // Avança sozinho a cada 5s (pausa se o usuário preferir menos movimento)
  useEffect(() => {
    if (offers.length < 2 || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const t = window.setInterval(() => {
      const el = trackRef.current;
      if (!el) return;
      const next = (Math.round(el.scrollLeft / el.clientWidth) + 1) % offers.length;
      el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
    }, 5000);
    return () => window.clearInterval(t);
  }, [offers.length]);

  if (offers.length === 0) return null;

  return (
    <section aria-label={title} style={{ padding: '18px 0 4px' }}>
      <h2 style={{ margin: '0 16px 12px', fontSize: 18, fontWeight: 600, color: C.text }}>{title}</h2>
      <div
        ref={trackRef}
        onScroll={onScroll}
        style={{ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', scrollbarWidth: 'none' }}
      >
        {offers.map((o) => {
          const item = o.menuItemId ? itemsById.get(o.menuItemId) : undefined;
          const content = (
            <>
              {/* Brilho diagonal, como no banner da referência */}
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute', left: -40, bottom: -70, width: 230, height: 160, borderRadius: 40,
                  background: 'rgba(255,255,255,0.14)', transform: 'rotate(-18deg)',
                }}
              />
              <span style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 44, fontWeight: 700, lineHeight: 1 }}>{o.highlight}</span>
                <span style={{ display: 'block', fontSize: 17, fontWeight: 500, marginTop: 10, lineHeight: 1.25 }}>
                  {o.title}
                  {o.subtitle && <><br />{o.subtitle}</>}
                </span>
              </span>
              {item && (
                <span style={{ position: 'relative', borderRadius: '50%', padding: 4, background: 'rgba(255,255,255,0.9)' }}>
                  <FoodImage src={item.imageUrl} alt={item.name} hint={[item.description]} size={104} shadow={false} />
                </span>
              )}
            </>
          );
          const style: React.CSSProperties = {
            position: 'relative',
            flex: '0 0 100%',
            scrollSnapAlign: 'center',
            padding: '0 16px',
            border: 'none',
            background: 'none',
            textAlign: 'left',
            fontFamily: FONT,
          };
          const inner: React.CSSProperties = {
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            minHeight: 156,
            padding: '22px 18px 22px 24px',
            borderRadius: RADIUS.lg + 4,
            background: o.color,
            color: '#fff',
            boxShadow: `0 12px 28px ${o.color}55`,
          };
          return item ? (
            <button key={o.id} type="button" onClick={() => onOpenItem(item)} style={{ ...style, cursor: 'pointer' }} aria-label={`${o.highlight} ${o.title} ${o.subtitle} — ver ${item.name}`}>
              <span style={inner}>{content}</span>
            </button>
          ) : (
            <div key={o.id} style={style}>
              <div style={inner}>{content}</div>
            </div>
          );
        })}
      </div>
      {offers.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12 }} aria-hidden="true">
          {offers.map((o, i) => (
            <span
              key={o.id}
              style={{
                width: i === index ? 18 : 6, height: 6, borderRadius: 3,
                background: i === index ? C.primary : '#D9D9D9', transition: 'width 0.2s',
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ── Faixa de destaques (mais pedidos) ─────────────────────────────────────────

export function PopularRow({
  title, items, ratings, onOpenItem,
}: {
  title: string;
  items: MenuItem[];
  ratings: Record<string, { rating: number; reviews: number }> | null;
  onOpenItem: (item: MenuItem) => void;
}) {
  if (items.length === 0) return null;
  return (
    <section aria-label={title} style={{ paddingTop: 18 }}>
      <h2 style={{ margin: '0 16px 12px', fontSize: 18, fontWeight: 600, color: C.text }}>
        {title} <span aria-hidden="true">🔥</span>
      </h2>
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '2px 16px 14px', scrollbarWidth: 'none' }}>
        {items.map((item, idx) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpenItem(item)}
            style={{
              position: 'relative',
              flexShrink: 0,
              width: 148,
              padding: '14px 12px 12px',
              border: 'none',
              borderRadius: RADIUS.md,
              background: C.surface,
              boxShadow: SHADOW.card,
              textAlign: 'left',
              cursor: 'pointer',
              fontFamily: FONT,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                position: 'absolute', top: 10, left: 10, minWidth: 22, height: 22, borderRadius: 11,
                background: C.primarySoft, color: C.primary, fontSize: 11, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px',
              }}
            >
              {idx + 1}º
            </span>
            <span style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
              <FoodImage src={item.imageUrl} alt={item.name} hint={[item.description]} size={82} />
            </span>
            <span
              style={{
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                fontSize: 13, fontWeight: 600, color: C.text, lineHeight: 1.3, minHeight: 34,
              }}
            >
              {item.name}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, gap: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.primary }}>{formatPrice(item.price)}</span>
              <Rating value={ratings?.[item.id]} />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
