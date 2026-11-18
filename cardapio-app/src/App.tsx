import React, { useMemo, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import MenuPage from './pages/MenuPage';
import ComandaPage from './pages/ComandaPage';
import CartDrawer from './components/CartDrawer';
import IdentModal from './components/IdentModal';
import BottomNav from './components/BottomNav';
import { CartProvider, useCart } from './lib/CartContext';
import { MenuProvider, useMenu } from './lib/MenuContext';
import { FavoritesProvider } from './lib/FavoritesContext';
import WelcomeScreen from './components/WelcomeScreen';
import { getSession, setSession } from './lib/session';
import { pedidosApi } from './lib/api';
import { captureQrTableFromUrl, getQrTable } from './lib/qrTable';

const WELCOME_KEY = 'bdg_welcome_seen';

function Shell() {
  const navigate = useNavigate();
  const cart = useCart();
  const [identModalOpen, setIdentModalOpen] = useState(false);
  const menu = useMenu();
  const [welcomeSeen, setWelcomeSeen] = useState(() => {
    try {
      // ?boasvindas na URL força a tela de novo (útil para conferir a configuração do admin)
      const params = new URLSearchParams(window.location.search);
      if (params.has('boasvindas')) {
        sessionStorage.removeItem(WELCOME_KEY);
        params.delete('boasvindas');
        const rest = params.toString();
        window.history.replaceState({}, '', window.location.pathname + (rest ? `?${rest}` : ''));
        return false;
      }
      return sessionStorage.getItem(WELCOME_KEY) === '1';
    } catch { return true; }
  });

  const session = getSession();
  const qrTable = getQrTable();

  async function handleConfirmOrder(customerName: string, tableNumber: string) {
    const payload = cart.items.map((c) => ({
      menuItemId: c.menuItemId,
      quantity: c.quantity,
      notes: c.notes,
      selectedOptionIds: c.selectedOptionIds,
    }));
    const comanda = qrTable
      ? await pedidosApi.create({ customerName, tableId: qrTable.tableId, items: payload })
      : await pedidosApi.create({ customerName, tableNumber, items: payload });
    setSession({ token: comanda.token, customerName, tableNumber: qrTable?.label ?? tableNumber });
    cart.clear();
    setIdentModalOpen(false);
    cart.close();
    navigate('/comanda');
  }

  async function handleAddToExisting() {
    const s = getSession();
    if (!s) return;
    await pedidosApi.addItems(s.token, cart.items);
    cart.clear();
    cart.close();
    navigate('/comanda');
  }

  // Uma vez por visita (aba). Não depende de pedido anterior: a sessão de comanda fica
  // salva no aparelho mesmo depois de fechada e esconderia a tela para sempre.
  const showWelcome = !welcomeSeen && !menu.loading;
  // Círculos da boas-vindas: destaques primeiro, depois o resto do cardápio
  const welcomeItems = useMemo(() => {
    const popular = new Set(menu.settings.popular?.menuItemIds ?? []);
    return [...menu.items].sort((a, b) => Number(popular.has(b.id)) - Number(popular.has(a.id)));
  }, [menu.items, menu.settings.popular]);

  return (
    <>
      <Routes>
        <Route path="/" element={<MenuPage />} />
        <Route path="/favoritos" element={menu.settings.favorites ? <MenuPage view="favorites" /> : <MenuPage />} />
        <Route path="/comanda" element={<ComandaPage />} />
      </Routes>

      <BottomNav hasSession={!!session} showFavorites={menu.settings.favorites} />

      <CartDrawer
        onOrder={() => {
          cart.close();
          setIdentModalOpen(true);
        }}
        onAddToExisting={handleAddToExisting}
      />

      {/* Boas-vindas: uma vez por visita (sessionStorage) */}
      {showWelcome && menu.settings.welcome && (
        <WelcomeScreen
          {...menu.settings.welcome}
          items={welcomeItems}
          onStart={() => {
            try { sessionStorage.setItem(WELCOME_KEY, '1'); } catch { /* armazenamento indisponível */ }
            setWelcomeSeen(true);
          }}
        />
      )}

      <IdentModal
        open={identModalOpen}
        onClose={() => {
          setIdentModalOpen(false);
          cart.open();
        }}
        onConfirm={handleConfirmOrder}
        qrTable={qrTable}
        itemCount={cart.count}
        total={cart.total}
      />
    </>
  );
}

export default function App() {
  // Síncrono (não em useEffect) — precisa terminar antes do MenuPage renderizar
  // e ler a mesa, já que os efeitos dos filhos disparam antes dos do pai.
  captureQrTableFromUrl();

  return (
    <MenuProvider>
      <FavoritesProvider>
        <CartProvider>
          <Shell />
        </CartProvider>
      </FavoritesProvider>
    </MenuProvider>
  );
}
