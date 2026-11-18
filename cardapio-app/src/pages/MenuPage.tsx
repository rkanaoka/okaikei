import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { menuApi } from '../lib/api';
import type { Category, MenuItem } from '../lib/types';
import { useCart } from '../lib/CartContext';
import { getSession, tableDisplay } from '../lib/session';
import { getQrTable } from '../lib/qrTable';
import { APP_MAX_WIDTH, C, FONT, PAGE_BACKGROUND, RADIUS, SHADOW, formatPrice, iconButton, itemEmoji } from '../theme';
import ProdutoCard from '../components/ProdutoCard';
import ItemDetailModal, { AddPayload } from '../components/ItemDetailModal';
import { IconClose, IconReceipt, IconRefresh, IconSearch } from '../components/Icons';
import { BOTTOM_NAV_HEIGHT } from '../components/BottomNav';

/** Busca sem diferenciar maiúsculas e acentos ("salmao" encontra "Salmão"). */
function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function Splash() {
  return (
    <div
      role="status"
      aria-label="Carregando cardápio"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        background: C.primary,
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        fontFamily: FONT,
      }}
    >
      <span style={{ fontSize: 64, lineHeight: 1 }} aria-hidden="true">🍣</span>
      <span style={{ fontSize: 30, fontWeight: 700, letterSpacing: 1 }}>Bodogami</span>
      <span style={{ fontSize: 13, opacity: 0.85 }}>Preparando o cardápio…</span>
      <span
        aria-hidden="true"
        style={{
          marginTop: 10,
          width: 28,
          height: 28,
          borderRadius: '50%',
          border: '3px solid rgba(255,255,255,0.35)',
          borderTopColor: '#fff',
          animation: 'bdg-spin 0.8s linear infinite',
        }}
      />
    </div>
  );
}

export default function MenuPage() {
  const navigate = useNavigate();
  const cart = useCart();
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [detailItem, setDetailItem] = useState<MenuItem | null>(null);
  const [toast, setToast] = useState('');

  const session = getSession();
  const qrTable = getQrTable();
  const tableLabel = qrTable?.label || tableDisplay(session?.tableNumber);

  const tabsWrapRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const isProgrammaticScroll = useRef(false);
  const programmaticScrollTimeout = useRef<number>();
  const toastTimeout = useRef<number>();
  const [stickyOffset, setStickyOffset] = useState(64);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    menuApi
      .getAll()
      .then(({ categories: cats, items: its }) => {
        const sorted = [...cats].sort((a, b) => a.sortOrder - b.sortOrder);
        setCategories(sorted);
        setItems(its);
      })
      .catch(() => setError('Não foi possível carregar o cardápio. Verifique sua conexão e tente novamente.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Fonte única para as seções da rolagem e para as abas: categorias com itens, na ordem.
  const categoriesWithItems = useMemo(
    () =>
      categories
        .map((cat) => ({
          cat,
          items: items
            .filter((i) => i.categoryId === cat.id || i.category === cat.id)
            .sort((a, b) => Number(b.available) - Number(a.available) || a.sortOrder - b.sortOrder),
        }))
        .filter((g) => g.items.length > 0),
    [categories, items]
  );

  const categoryNameOf = useCallback(
    (item: MenuItem) => categories.find((c) => c.id === item.categoryId || c.id === item.category)?.name,
    [categories]
  );

  const searchTerm = normalize(search.trim());
  const searchResults = useMemo(() => {
    if (!searchTerm) return [];
    return items.filter((i) =>
      normalize(`${i.name} ${i.description ?? ''} ${categoryNameOf(i) ?? ''}`).includes(searchTerm)
    );
  }, [items, searchTerm, categoryNameOf]);

  const inCartByItem = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of cart.items) map.set(c.menuItemId, (map.get(c.menuItemId) ?? 0) + c.quantity);
    return map;
  }, [cart.items]);

  useEffect(() => {
    if (!activeCategory && categoriesWithItems.length) setActiveCategory(categoriesWithItems[0].cat.id);
  }, [categoriesWithItems, activeCategory]);

  // Altura das abas fixas — define a "linha de corte" do scroll-spy e o scroll-margin das seções.
  useEffect(() => {
    function measure() {
      setStickyOffset(tabsWrapRef.current?.getBoundingClientRect().height ?? 64);
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [categoriesWithItems.length, searchTerm]);

  // Scroll-spy: a aba ativa é a última seção cujo topo já passou da linha abaixo das abas.
  useEffect(() => {
    if (categoriesWithItems.length === 0 || searchTerm) return;
    let ticking = false;

    function computeActive() {
      ticking = false;
      if (isProgrammaticScroll.current) return;
      let current = categoriesWithItems[0].cat.id;
      for (const { cat } of categoriesWithItems) {
        const el = sectionRefs.current.get(cat.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top - stickyOffset <= 24) current = cat.id;
        else break;
      }
      setActiveCategory((prev) => (prev === current ? prev : current));
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(computeActive);
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    computeActive();
    return () => window.removeEventListener('scroll', onScroll);
  }, [categoriesWithItems, stickyOffset, searchTerm]);

  // Mantém a aba ativa visível na barra horizontal.
  useEffect(() => {
    tabRefs.current.get(activeCategory)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [activeCategory]);

  // O detalhe é uma "página" sobreposta: entra no histórico para que o botão
  // voltar do celular feche o detalhe em vez de sair do cardápio.
  useEffect(() => {
    function onPopState() { setDetailItem(null); }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  function openDetail(item: MenuItem) {
    if (!detailItem) window.history.pushState({ bdgDetail: true }, '');
    setDetailItem(item);
  }

  function closeDetail() {
    if (window.history.state?.bdgDetail) window.history.back();
    else setDetailItem(null);
  }

  function handleTabClick(catId: string) {
    const el = sectionRefs.current.get(catId);
    if (!el) return;
    isProgrammaticScroll.current = true;
    setActiveCategory(catId);
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (programmaticScrollTimeout.current) window.clearTimeout(programmaticScrollTimeout.current);
    programmaticScrollTimeout.current = window.setTimeout(() => { isProgrammaticScroll.current = false; }, 700);
  }

  function showToast(message: string) {
    setToast(message);
    if (toastTimeout.current) window.clearTimeout(toastTimeout.current);
    toastTimeout.current = window.setTimeout(() => setToast(''), 2200);
  }

  function handleQuickAdd(item: MenuItem) {
    cart.add({ menuItemId: item.id, name: item.name, price: Number(item.price), quantity: 1, imageUrl: item.imageUrl });
    showToast(`${item.name} adicionado ao carrinho`);
  }

  function addFromDetail({ item, notes, selectedOptionIds, unitPrice, quantity }: AddPayload) {
    cart.add({
      menuItemId: item.id,
      name: item.name,
      price: unitPrice,
      quantity,
      notes: notes || undefined,
      selectedOptionIds: selectedOptionIds.length ? selectedOptionIds : undefined,
      imageUrl: item.imageUrl,
    });
  }

  const similarItems = useMemo(() => {
    if (!detailItem) return [];
    return items
      .filter((i) => i.id !== detailItem.id && (i.categoryId ?? i.category) === (detailItem.categoryId ?? detailItem.category))
      .sort((a, b) => Number(b.available) - Number(a.available) || a.sortOrder - b.sortOrder)
      .slice(0, 8);
  }, [detailItem, items]);

  const showCartBar = cart.count > 0 && !detailItem;

  const sectionTitle: React.CSSProperties = {
    margin: '0 0 12px',
    fontSize: 18,
    fontWeight: 600,
    color: C.text,
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  };

  const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 };

  function renderGrid(list: MenuItem[]) {
    return (
      <div style={grid}>
        {list.map((item) => (
          <ProdutoCard
            key={item.id}
            item={item}
            categoryName={categoryNameOf(item)}
            inCart={inCartByItem.get(item.id) ?? 0}
            onAdd={handleQuickAdd}
            onOpenDetail={openDetail}
          />
        ))}
      </div>
    );
  }

  if (loading && items.length === 0) return <Splash />;

  return (
    <div
      style={{
        maxWidth: APP_MAX_WIDTH,
        margin: '0 auto',
        minHeight: '100vh',
        background: PAGE_BACKGROUND,
        fontFamily: FONT,
        paddingBottom: BOTTOM_NAV_HEIGHT + (showCartBar ? 84 : 24),
      }}
    >
      {/* Cabeçalho: marca, mesa atual e atalho para a comanda */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: 'calc(16px + env(safe-area-inset-top)) 16px 4px',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: C.primary,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            boxShadow: SHADOW.button,
            flexShrink: 0,
          }}
        >
          🍣
        </div>
        <div style={{ textAlign: 'center', minWidth: 0 }}>
          <div style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>
            {tableLabel ? 'Você está na' : 'Bem-vindo ao'}
          </div>
          <div
            style={{
              fontSize: 16,
              color: C.primary,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {tableLabel || 'Bodogami'}
          </div>
        </div>
        <button
          type="button"
          style={{ ...iconButton, visibility: session ? 'visible' : 'hidden' }}
          onClick={() => navigate('/comanda')}
          aria-label="Acompanhar meu pedido"
        >
          <IconReceipt size={20} />
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 9,
              right: 10,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: C.primary,
              border: '2px solid #fff',
            }}
          />
        </button>
      </header>

      {/* Busca */}
      <div style={{ padding: '14px 16px 4px' }}>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            height: 50,
            padding: '0 14px',
            background: C.surface,
            borderRadius: RADIUS.sm + 2,
            border: `1px solid ${C.border}`,
            boxShadow: SHADOW.card,
            color: C.textMuted,
          }}
        >
          <IconSearch size={20} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar no cardápio…"
            aria-label="Buscar no cardápio"
            enterKeyHint="search"
            style={{
              flex: 1,
              minWidth: 0,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontFamily: FONT,
              fontSize: 16, // ≥16px evita o zoom automático do iOS ao focar
              color: C.text,
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Limpar busca"
              style={{ border: 'none', background: '#F1F1F1', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.textMuted }}
            >
              <IconClose size={14} strokeWidth={2.4} />
            </button>
          )}
        </label>
      </div>

      {/* Abas de categoria fixas no topo (escondidas durante a busca) */}
      {!searchTerm && categoriesWithItems.length > 0 && (
        <nav
          ref={tabsWrapRef}
          aria-label="Categorias"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 40,
            background: 'rgba(247,247,247,0.92)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '12px 16px', scrollbarWidth: 'none' }}>
            {categoriesWithItems.map(({ cat, items: catItems }) => {
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  aria-current={active ? 'true' : undefined}
                  ref={(el) => { if (el) tabRefs.current.set(cat.id, el); else tabRefs.current.delete(cat.id); }}
                  onClick={() => handleTabClick(cat.id)}
                  style={{
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '5px 16px 5px 5px',
                    borderRadius: RADIUS.pill,
                    border: 'none',
                    background: active ? C.primary : C.surface,
                    color: active ? '#fff' : C.text,
                    boxShadow: active ? SHADOW.button : SHADOW.card,
                    fontFamily: FONT,
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      background: active ? 'rgba(255,255,255,0.25)' : C.primarySoft,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                    }}
                  >
                    {itemEmoji(cat.name, ...catItems.slice(0, 3).map((i) => i.name))}
                  </span>
                  {cat.name}
                </button>
              );
            })}
          </div>
        </nav>
      )}

      <main style={{ padding: '10px 16px 0' }}>
        {error && (
          <div
            role="alert"
            style={{
              margin: '24px 0',
              padding: 20,
              background: C.surface,
              borderRadius: RADIUS.md,
              boxShadow: SHADOW.card,
              textAlign: 'center',
              color: C.text,
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 6 }} aria-hidden="true">😕</div>
            <div style={{ fontSize: 14, marginBottom: 14, color: C.textMuted }}>{error}</div>
            <button
              type="button"
              onClick={load}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                border: 'none',
                borderRadius: RADIUS.pill,
                background: C.primary,
                color: '#fff',
                padding: '12px 22px',
                fontFamily: FONT,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: SHADOW.button,
              }}
            >
              <IconRefresh size={18} /> Tentar novamente
            </button>
          </div>
        )}

        {searchTerm ? (
          <section aria-live="polite">
            <h2 style={sectionTitle}>
              Resultados
              <span style={{ fontSize: 13, fontWeight: 400, color: C.textMuted }}>
                {searchResults.length} {searchResults.length === 1 ? 'item' : 'itens'}
              </span>
            </h2>
            {searchResults.length > 0 ? (
              renderGrid(searchResults)
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: C.textMuted }}>
                <div style={{ fontSize: 40, marginBottom: 8 }} aria-hidden="true">🔍</div>
                <div style={{ fontSize: 15, color: C.text, fontWeight: 500 }}>Nada encontrado para “{search.trim()}”</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>Tente outro nome ou ingrediente.</div>
              </div>
            )}
          </section>
        ) : (
          <>
            {!error && categoriesWithItems.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: C.textMuted }}>
                <div style={{ fontSize: 40, marginBottom: 8 }} aria-hidden="true">🍽️</div>
                <div style={{ fontSize: 15, color: C.text, fontWeight: 500 }}>Nenhum item disponível no momento</div>
              </div>
            )}
            {categoriesWithItems.map(({ cat, items: catItems }) => (
              <section
                key={cat.id}
                aria-label={cat.name}
                ref={(el) => { if (el) sectionRefs.current.set(cat.id, el); else sectionRefs.current.delete(cat.id); }}
                style={{ scrollMarginTop: stickyOffset + 8, marginBottom: 28, paddingTop: 8 }}
              >
                <h2 style={sectionTitle}>
                  {cat.name}
                  <span style={{ fontSize: 13, fontWeight: 400, color: C.textMuted }}>
                    {catItems.length} {catItems.length === 1 ? 'item' : 'itens'}
                  </span>
                </h2>
                {renderGrid(catItems)}
              </section>
            ))}
          </>
        )}
      </main>

      {/* Barra flutuante do carrinho, logo acima da navegação inferior */}
      {showCartBar && (
        <button
          type="button"
          onClick={cart.open}
          style={{
            position: 'fixed',
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: `calc(${BOTTOM_NAV_HEIGHT + 12}px + env(safe-area-inset-bottom))`,
            width: `min(calc(100% - 32px), ${APP_MAX_WIDTH - 32}px)`,
            height: 58,
            zIndex: 80,
            border: 'none',
            borderRadius: RADIUS.pill,
            background: C.primary,
            color: '#fff',
            boxShadow: SHADOW.button,
            fontFamily: FONT,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 8px 0 22px',
            cursor: 'pointer',
            animation: 'bdg-pop 0.2s ease-out',
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 600 }}>Ver carrinho</span>
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(255,255,255,0.18)',
              borderRadius: RADIUS.pill,
              padding: '9px 14px',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {cart.count} {cart.count === 1 ? 'item' : 'itens'} · {formatPrice(cart.total)}
          </span>
        </button>
      )}

      {toast && (
        <div
          role="status"
          style={{
            position: 'fixed',
            left: '50%',
            transform: 'translateX(-50%)',
            top: 'calc(16px + env(safe-area-inset-top))',
            zIndex: 400,
            maxWidth: 'calc(100% - 32px)',
            background: C.text,
            color: '#fff',
            borderRadius: RADIUS.pill,
            padding: '10px 18px',
            fontFamily: FONT,
            fontSize: 13,
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            animation: 'bdg-pop 0.2s ease-out',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          ✓ {toast}
        </div>
      )}

      <ItemDetailModal
        item={detailItem}
        categoryName={detailItem ? categoryNameOf(detailItem) : undefined}
        similar={similarItems}
        onClose={closeDetail}
        onOpenItem={(item) => setDetailItem(item)}
        onAdd={(payload) => {
          addFromDetail(payload);
          closeDetail();
          showToast(`${payload.quantity}× ${payload.item.name} adicionado`);
        }}
        onOrderNow={(payload) => {
          addFromDetail(payload);
          closeDetail();
          cart.open();
        }}
      />
    </div>
  );
}
