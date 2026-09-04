import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { menuApi } from '../lib/api';
import { pedidosApi } from '../lib/api';
import type { Category, MenuItem } from '../lib/types';
import { addToCart, getCart, clearCart, cartCount } from '../lib/cart';
import { getSession, setSession } from '../lib/session';
import { getQrTable } from '../lib/qrTable';
import ProdutoCard from '../components/ProdutoCard';
import CartDrawer from '../components/CartDrawer';
import IdentModal from '../components/IdentModal';
import ItemDetailModal from '../components/ItemDetailModal';

function formatPrice(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function MenuPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [identModalOpen, setIdentModalOpen] = useState(false);
  const [cartVersion, setCartVersion] = useState(0);
  const [detailItem, setDetailItem] = useState<MenuItem | null>(null);

  const cartItems = getCart();
  const count = cartCount(cartItems);
  const qrTable = getQrTable();

  const bumpCart = useCallback(() => setCartVersion((v) => v + 1), []);

  // Refs para medir a altura do cabeçalho fixo (header + abas) e para
  // localizar cada seção/aba durante a rolagem (scroll-spy).
  const headerRef = useRef<HTMLDivElement>(null);
  const tabsWrapRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const isProgrammaticScroll = useRef(false);
  const programmaticScrollTimeout = useRef<number>();

  const [headerHeight, setHeaderHeight] = useState(72);
  const [stickyOffset, setStickyOffset] = useState(114);

  useEffect(() => {
    menuApi
      .getAll()
      .then(({ categories: cats, items: its }) => {
        const sorted = [...cats].sort((a, b) => a.sortOrder - b.sortOrder);
        setCategories(sorted);
        setItems(its);
        const firstWithItems = sorted.find((c) =>
          its.some((i) => i.categoryId === c.id || i.category === c.id)
        );
        setActiveCategory(firstWithItems?.id ?? sorted[0]?.id ?? '');
      })
      .catch(() => setError('Não foi possível carregar o cardápio. Verifique sua conexão.'))
      .finally(() => setLoading(false));
  }, []);

  // Todas as categorias com pelo menos 1 item, na ordem de exibição —
  // fonte única tanto para as seções da rolagem quanto para as abas.
  const categoriesWithItems = useMemo(
    () =>
      categories
        .map((cat) => ({
          cat,
          items: items
            .filter((i) => i.categoryId === cat.id || i.category === cat.id)
            .sort((a, b) => a.sortOrder - b.sortOrder),
        }))
        .filter((g) => g.items.length > 0),
    [categories, items]
  );

  // Mede a altura real do header + abas (fixos no topo) para saber onde
  // a "linha de corte" da rolagem fica, tanto pro scroll-spy quanto pro
  // scroll-margin-top das seções.
  useEffect(() => {
    function measure() {
      const h = headerRef.current?.getBoundingClientRect().height ?? 0;
      const t = tabsWrapRef.current?.getBoundingClientRect().height ?? 0;
      setHeaderHeight(h);
      setStickyOffset(h + t);
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [categoriesWithItems.length]);

  // Scroll-spy: conforme o usuário rola, a categoria "ativa" passa a ser a
  // última seção cujo topo já cruzou a linha logo abaixo do header fixo.
  useEffect(() => {
    if (categoriesWithItems.length === 0) return;
    let ticking = false;

    function computeActive() {
      ticking = false;
      if (isProgrammaticScroll.current) return;
      let current = categoriesWithItems[0].cat.id;
      for (const { cat } of categoriesWithItems) {
        const el = sectionRefs.current.get(cat.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top - stickyOffset <= 16) current = cat.id;
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
  }, [categoriesWithItems, stickyOffset]);

  // Mantém a aba ativa sempre visível dentro da barra horizontal de categorias.
  useEffect(() => {
    tabRefs.current.get(activeCategory)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [activeCategory]);

  function handleTabClick(catId: string) {
    const el = sectionRefs.current.get(catId);
    if (!el) return;
    isProgrammaticScroll.current = true;
    setActiveCategory(catId);
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (programmaticScrollTimeout.current) window.clearTimeout(programmaticScrollTimeout.current);
    programmaticScrollTimeout.current = window.setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 700);
  }

  function handleAdd(item: MenuItem) {
    addToCart({ menuItemId: item.id, name: item.name, price: item.price, quantity: 1 });
    bumpCart();
  }

  function handleAddWithOptions(item: MenuItem, notes: string, selectedOptionIds: string[], unitPrice: number) {
    addToCart({
      menuItemId: item.id,
      name: item.name,
      price: unitPrice,
      quantity: 1,
      notes: notes || undefined,
      selectedOptionIds: selectedOptionIds.length ? selectedOptionIds : undefined,
    });
    bumpCart();
    setDetailItem(null);
  }

  async function handleConfirmOrder(customerName: string, tableNumber: string) {
    const cart = getCart();
    const payload = cart.map((c) => ({
      menuItemId: c.menuItemId,
      quantity: c.quantity,
      notes: c.notes,
    }));
    const comanda = qrTable
      ? await pedidosApi.create({ customerName, tableId: qrTable.tableId, items: payload })
      : await pedidosApi.create({ customerName, tableNumber, items: payload });
    setSession({ token: comanda.token, customerName, tableNumber: qrTable?.label ?? tableNumber });
    clearCart();
    bumpCart();
    setIdentModalOpen(false);
    setCartDrawerOpen(false);
    navigate('/comanda');
  }

  async function handleAddToExisting() {
    const session = getSession();
    if (!session) return;
    const cart = getCart();
    await pedidosApi.addItems(session.token, cart);
    clearCart();
    bumpCart();
    setCartDrawerOpen(false);
    navigate('/comanda');
  }

  const wrapStyle: React.CSSProperties = {
    maxWidth: 480,
    margin: '0 auto',
    minHeight: '100vh',
    background: '#f4f6f8',
    display: 'flex',
    flexDirection: 'column',
  };

  const headerStyle: React.CSSProperties = {
    background: '#0D1B2A',
    padding: '20px 16px 16px',
    position: 'sticky',
    top: 0,
    zIndex: 50,
  };

  const logoStyle: React.CSSProperties = {
    fontSize: 26,
    fontWeight: 900,
    color: '#FFD60A',
    letterSpacing: 1,
    lineHeight: 1,
  };

  const taglineStyle: React.CSSProperties = {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
  };

  const tabsWrapStyle: React.CSSProperties = {
    background: '#0D1B2A',
    paddingBottom: 12,
    position: 'sticky',
    top: headerHeight,
    zIndex: 49,
  };

  const sectionStyle: React.CSSProperties = {
    scrollMarginTop: stickyOffset + 8,
    marginBottom: 28,
  };

  const sectionHeadingStyle: React.CSSProperties = {
    fontSize: 16,
    fontWeight: 800,
    color: '#0D1B2A',
    margin: '4px 0 10px',
  };

  const tabsInnerStyle: React.CSSProperties = {
    display: 'flex',
    gap: 6,
    overflowX: 'auto',
    padding: '0 16px',
    scrollbarWidth: 'none',
  };

  const contentStyle: React.CSSProperties = {
    flex: 1,
    padding: '16px 16px 100px',
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 12,
  };

  const fabStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 76,
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#FF6B2B',
    color: '#fff',
    border: 'none',
    borderRadius: 24,
    padding: '14px 24px',
    fontSize: 15,
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(255,107,43,0.4)',
    whiteSpace: 'nowrap',
    zIndex: 60,
    display: count > 0 ? 'block' : 'none',
  };

  const errorStyle: React.CSSProperties = {
    margin: 20,
    padding: 16,
    background: '#fff0f0',
    border: '1px solid #E63946',
    borderRadius: 10,
    color: '#E63946',
    fontSize: 14,
    fontWeight: 600,
    textAlign: 'center',
  };

  const loadingStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: 12,
    color: '#666',
    padding: 40,
  };

  return (
    <div style={wrapStyle}>
      <div style={headerStyle} ref={headerRef}>
        <div style={logoStyle}>BODOGAMI</div>
        <div style={taglineStyle}>Cardápio Digital</div>
      </div>

      {categoriesWithItems.length > 0 && (
        <div style={tabsWrapStyle} ref={tabsWrapRef}>
          <div style={tabsInnerStyle}>
            {categoriesWithItems.map(({ cat }) => {
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  ref={(el) => {
                    if (el) tabRefs.current.set(cat.id, el);
                    else tabRefs.current.delete(cat.id);
                  }}
                  onClick={() => handleTabClick(cat.id)}
                  style={{
                    flexShrink: 0,
                    padding: '7px 16px',
                    borderRadius: 20,
                    border: 'none',
                    background: active ? '#FFD60A' : 'rgba(255,255,255,0.1)',
                    color: active ? '#0D1B2A' : 'rgba(255,255,255,0.8)',
                    fontSize: 13,
                    fontWeight: active ? 800 : 500,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div style={contentStyle}>
        {loading && (
          <div style={loadingStyle}>
            <span style={{ fontSize: 36 }}>🍣</span>
            <span style={{ fontSize: 15, fontWeight: 600 }}>Carregando cardápio...</span>
          </div>
        )}

        {!loading && error && <div style={errorStyle}>{error}</div>}

        {!loading && !error && categoriesWithItems.length === 0 && (
          <div style={loadingStyle}>
            <span style={{ fontSize: 36 }}>🍽️</span>
            <span style={{ fontSize: 15, fontWeight: 600 }}>Nenhum item disponível</span>
          </div>
        )}

        {!loading &&
          !error &&
          categoriesWithItems.map(({ cat, items: catItems }) => (
            <div
              key={cat.id}
              style={sectionStyle}
              ref={(el) => {
                if (el) sectionRefs.current.set(cat.id, el);
                else sectionRefs.current.delete(cat.id);
              }}
            >
              <h3 style={sectionHeadingStyle}>{cat.name}</h3>
              <div style={gridStyle}>
                {catItems.map((item) => (
                  <ProdutoCard key={item.id} item={item} onAdd={handleAdd} onOpenDetail={setDetailItem} />
                ))}
              </div>
            </div>
          ))}
      </div>

      <button
        style={fabStyle}
        onClick={() => setCartDrawerOpen(true)}
        aria-label="Ver carrinho"
      >
        Ver carrinho ({count} {count === 1 ? 'item' : 'itens'})
      </button>

      <CartDrawer
        open={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
        onOrder={() => {
          setCartDrawerOpen(false);
          setIdentModalOpen(true);
        }}
        onAddToExisting={handleAddToExisting}
        cartVersion={cartVersion}
        onCartChange={bumpCart}
      />

      <IdentModal
        open={identModalOpen}
        onClose={() => setIdentModalOpen(false)}
        onConfirm={handleConfirmOrder}
        qrTable={qrTable}
      />

      <ItemDetailModal item={detailItem} onClose={() => setDetailItem(null)} onAdd={handleAddWithOptions} />
    </div>
  );
}
