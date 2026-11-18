import React, { useEffect, useRef, useState } from 'react';
import type { MenuItem } from '../lib/types';
import { APP_MAX_WIDTH, C, FONT, PAGE_BACKGROUND, RADIUS, SHADOW, formatPrice, iconButton } from '../theme';
import FoodImage from './FoodImage';
import QuantityControl from './QuantityControl';
import { IconBack, IconBag, IconCart } from './Icons';
import { FavoriteButton, Rating } from './Showcase';

export interface AddPayload {
  item: MenuItem;
  notes: string;
  selectedOptionIds: string[];
  unitPrice: number;
  quantity: number;
}

interface Props {
  item: MenuItem | null;
  categoryName?: string;
  /** Outros itens da mesma categoria, para "Você também pode gostar". */
  similar: MenuItem[];
  ratings?: Record<string, { rating: number; reviews: number }> | null;
  /** undefined = favoritos desligados no admin. */
  favorite?: { active: boolean; onToggle: () => void };
  onClose: () => void;
  onAdd: (payload: AddPayload) => void;
  onOrderNow: (payload: AddPayload) => void;
  onOpenItem: (item: MenuItem) => void;
}

const DESCRIPTION_PREVIEW = 160;

export default function ItemDetailModal({ item, categoryName, similar, ratings, favorite, onClose, onAdd, onOrderNow, onOpenItem }: Props) {
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [quantity, setQuantity] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const groupRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Reinicia o formulário ao trocar de item (inclusive vindo de "pratos parecidos")
  useEffect(() => {
    const initial: Record<string, string[]> = {};
    (item?.optionGroups ?? []).forEach((g) => { initial[g.id] = []; });
    setSelections(initial);
    setQuantity(1);
    setExpanded(false);
    setShowErrors(false);
    scrollRef.current?.scrollTo({ top: 0 });
  }, [item?.id]);

  // Trava a rolagem da página de fundo enquanto o detalhe está aberto
  useEffect(() => {
    if (!item) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [!!item]);

  if (!item) return null;

  const groups = item.optionGroups ?? [];
  const missingGroups = groups.filter((g) => (selections[g.id]?.length ?? 0) < g.minSelect);
  const isValid = missingGroups.length === 0;

  const optionsTotal = groups.reduce((sum, g) => {
    const ids = selections[g.id] ?? [];
    return sum + ids.reduce((s, oid) => s + (g.options.find((o) => o.id === oid)?.price ?? 0), 0);
  }, 0);
  const unitPrice = Number(item.price) + optionsTotal;

  function toggleOption(groupId: string, optionId: string, maxSelect: number) {
    setSelections((prev) => {
      const current = prev[groupId] ?? [];
      if (current.includes(optionId)) return { ...prev, [groupId]: current.filter((i) => i !== optionId) };
      if (maxSelect === 1) return { ...prev, [groupId]: [optionId] };
      if (current.length >= maxSelect) return prev;
      return { ...prev, [groupId]: [...current, optionId] };
    });
  }

  function buildNotes(): string {
    const parts: string[] = [];
    for (const g of groups) {
      const names = (selections[g.id] ?? [])
        .map((oid) => g.options.find((o) => o.id === oid)?.name)
        .filter(Boolean) as string[];
      // Nomes de grupo às vezes já terminam com ":" no cadastro — evita "Grupo:: Opção"
      if (names.length) parts.push(`${g.name.trim().replace(/:+$/, '')}: ${names.join(', ')}`);
    }
    return parts.join('; ');
  }

  function submit(handler: (p: AddPayload) => void) {
    if (!item || !item.available) return;
    if (!isValid) {
      // Em vez de um botão desabilitado sem explicação, leva o cliente até o grupo pendente
      setShowErrors(true);
      groupRefs.current.get(missingGroups[0].id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    handler({ item, notes: buildNotes(), selectedOptionIds: Object.values(selections).flat(), unitPrice, quantity });
  }

  const description = item.description ?? '';
  const longDescription = description.length > DESCRIPTION_PREVIEW;
  const shownDescription = !longDescription || expanded
    ? description
    : `${description.slice(0, DESCRIPTION_PREVIEW).trimEnd()}…`;

  const label: React.CSSProperties = { fontSize: 13, color: C.textMuted, marginBottom: 4 };
  const sectionTitle: React.CSSProperties = { fontSize: 15, fontWeight: 500, color: C.text, margin: '0 0 10px' };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={item.name}
      style={{ position: 'fixed', inset: 0, zIndex: 150, display: 'flex', justifyContent: 'center', background: 'rgba(31,31,31,0.25)' }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: APP_MAX_WIDTH,
          height: '100%',
          background: PAGE_BACKGROUND,
          display: 'flex',
          flexDirection: 'column',
          fontFamily: FONT,
          animation: 'bdg-slide-up 0.22s ease-out',
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'calc(14px + env(safe-area-inset-top)) 16px 10px',
            flexShrink: 0,
          }}
        >
          <button type="button" style={iconButton} onClick={onClose} aria-label="Voltar ao cardápio">
            <IconBack size={20} strokeWidth={2.2} />
          </button>
          <span style={{ fontSize: 16, fontWeight: 500, color: C.text }}>Detalhes</span>
          {favorite ? (
            <FavoriteButton variant="header" active={favorite.active} onToggle={favorite.onToggle} label={item.name} />
          ) : (
            <span style={{ width: 42 }} aria-hidden="true" />
          )}
        </header>

        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: 110 }}>
          {/* Topo: informações à esquerda, foto grande "saindo" pela direita */}
          <section style={{ position: 'relative', padding: '8px 16px 0', minHeight: 250 }}>
            <div style={{ position: 'absolute', top: 10, right: -70 }}>
              <FoodImage
                src={item.imageUrl}
                alt={item.name}
                hint={[categoryName, item.description]}
                size={260}
                style={{ opacity: item.available ? 1 : 0.5 }}
              />
            </div>

            <div style={{ position: 'relative', width: '56%' }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: C.text, lineHeight: 1.25 }}>{item.name}</h1>
              {ratings?.[item.id]?.reviews ? (
                <div style={{ marginTop: 6 }}><Rating value={ratings[item.id]} size="md" /></div>
              ) : null}
              {categoryName && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>{categoryName}</div>}

              <div style={{ marginTop: 18 }}>
                <div style={label}>Preço</div>
                <div style={{ fontSize: 20, fontWeight: 600, color: C.primary }}>{formatPrice(unitPrice)}</div>
                {quantity > 1 && (
                  <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                    Total: <b style={{ color: C.text }}>{formatPrice(unitPrice * quantity)}</b>
                  </div>
                )}
              </div>

              {item.available ? (
                <div style={{ marginTop: 18 }}>
                  <div style={{ ...label, marginBottom: 8 }}>Quantidade</div>
                  <QuantityControl
                    quantity={quantity}
                    onDecrease={() => setQuantity((q) => Math.max(1, q - 1))}
                    onIncrease={() => setQuantity((q) => Math.min(99, q + 1))}
                    label={item.name}
                  />
                </div>
              ) : (
                <div
                  style={{
                    marginTop: 18,
                    display: 'inline-block',
                    background: '#FDECEC',
                    color: C.danger,
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: RADIUS.pill,
                    padding: '6px 12px',
                  }}
                >
                  Indisponível no momento
                </div>
              )}
            </div>
          </section>

          <div style={{ padding: '24px 16px 0' }}>
            {groups.map((g) => {
              const selected = selections[g.id] ?? [];
              const missing = showErrors && selected.length < g.minSelect;
              const hint =
                g.minSelect === g.maxSelect
                  ? `Escolha ${g.minSelect}`
                  : g.minSelect > 0
                    ? `Escolha de ${g.minSelect} a ${g.maxSelect}`
                    : `Opcional · até ${g.maxSelect}`;
              return (
                <div
                  key={g.id}
                  ref={(el) => { if (el) groupRefs.current.set(g.id, el); else groupRefs.current.delete(g.id); }}
                  style={{ marginBottom: 22 }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                    <h2 style={{ ...sectionTitle, margin: 0 }}>{g.name}</h2>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                        color: missing ? C.danger : g.minSelect > 0 ? C.primary : C.textMuted,
                      }}
                    >
                      {missing ? 'Obrigatório' : hint}
                    </span>
                  </div>
                  <div role="group" aria-label={g.name} style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {g.options.map((o) => {
                      const isSel = selected.includes(o.id);
                      const atCap = !isSel && g.maxSelect > 1 && selected.length >= g.maxSelect;
                      return (
                        <button
                          key={o.id}
                          type="button"
                          aria-pressed={isSel}
                          disabled={atCap || !item.available}
                          onClick={() => toggleOption(g.id, o.id, g.maxSelect)}
                          style={{
                            padding: '10px 20px',
                            borderRadius: RADIUS.pill,
                            border: missing ? `1.5px solid ${C.danger}` : '1.5px solid transparent',
                            background: isSel ? C.primary : C.surface,
                            color: isSel ? '#fff' : C.text,
                            boxShadow: isSel ? SHADOW.button : SHADOW.card,
                            fontFamily: FONT,
                            fontWeight: 500,
                            fontSize: 14,
                            cursor: atCap ? 'default' : 'pointer',
                            opacity: atCap ? 0.45 : 1,
                            transition: 'background 0.15s, color 0.15s',
                          }}
                        >
                          {o.name}
                          {o.price > 0 && (
                            <span style={{ fontSize: 12, opacity: 0.85 }}> +{formatPrice(o.price)}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {description && (
              <div style={{ marginBottom: 26 }}>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: '#6B6B6B' }}>{shownDescription}</p>
                {longDescription && (
                  <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '4px 0',
                      color: C.primary,
                      fontFamily: FONT,
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    {expanded ? 'Ler menos' : 'Ler mais…'}
                  </button>
                )}
              </div>
            )}
          </div>

          {similar.length > 0 && (
            <section style={{ paddingTop: 2 }}>
              <h2 style={{ ...sectionTitle, padding: '0 16px' }}>Você também pode gostar</h2>
              <div style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '4px 16px 16px', scrollbarWidth: 'none' }}>
                {similar.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onOpenItem(s)}
                    style={{
                      flexShrink: 0,
                      width: 220,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      background: C.surface,
                      border: 'none',
                      borderRadius: RADIUS.md,
                      boxShadow: SHADOW.card,
                      padding: 12,
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontFamily: FONT,
                      opacity: s.available ? 1 : 0.55,
                    }}
                  >
                    <FoodImage src={s.imageUrl} alt={s.name} hint={[categoryName, s.description]} size={64} shadow={false} />
                    <span style={{ minWidth: 0 }}>
                      <span
                        style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          fontSize: 13,
                          fontWeight: 600,
                          color: C.text,
                          lineHeight: 1.3,
                        }}
                      >
                        {s.name}
                      </span>
                      <span style={{ display: 'block', marginTop: 4, fontSize: 13, fontWeight: 600, color: C.primary }}>
                        {formatPrice(s.price)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Ações fixas no rodapé, como na referência */}
        <footer
          style={{
            position: 'fixed',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
            maxWidth: APP_MAX_WIDTH,
            display: 'flex',
            gap: 12,
            padding: '14px 16px calc(14px + env(safe-area-inset-bottom))',
            background: 'linear-gradient(to top, rgba(247,247,247,1) 70%, rgba(247,247,247,0))',
          }}
        >
          <button
            type="button"
            disabled={!item.available}
            onClick={() => submit(onAdd)}
            style={{
              flex: 1,
              height: 54,
              borderRadius: RADIUS.pill,
              border: 'none',
              background: C.surface,
              color: item.available ? C.primary : '#BDBDBD',
              boxShadow: SHADOW.card,
              fontFamily: FONT,
              fontSize: 15,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              cursor: item.available ? 'pointer' : 'not-allowed',
            }}
          >
            <IconCart size={20} strokeWidth={2} />
            Adicionar
          </button>
          <button
            type="button"
            disabled={!item.available}
            onClick={() => submit(onOrderNow)}
            style={{
              flex: 1,
              height: 54,
              borderRadius: RADIUS.pill,
              border: 'none',
              background: item.available ? C.primary : '#D9D9D9',
              color: '#fff',
              boxShadow: item.available ? SHADOW.button : 'none',
              fontFamily: FONT,
              fontSize: 15,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              cursor: item.available ? 'pointer' : 'not-allowed',
            }}
          >
            <IconBag size={20} strokeWidth={2} />
            Pedir agora
          </button>
        </footer>
      </div>
    </div>
  );
}
