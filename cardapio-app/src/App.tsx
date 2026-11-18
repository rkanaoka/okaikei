import React, { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import MenuPage from './pages/MenuPage';
import ComandaPage from './pages/ComandaPage';
import CartDrawer from './components/CartDrawer';
import IdentModal from './components/IdentModal';
import BottomNav from './components/BottomNav';
import { CartProvider, useCart } from './lib/CartContext';
import { getSession, setSession } from './lib/session';
import { pedidosApi } from './lib/api';
import { captureQrTableFromUrl, getQrTable } from './lib/qrTable';

function Shell() {
  const navigate = useNavigate();
  const cart = useCart();
  const [identModalOpen, setIdentModalOpen] = useState(false);

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

  return (
    <>
      <Routes>
        <Route path="/" element={<MenuPage />} />
        <Route path="/comanda" element={<ComandaPage />} />
      </Routes>

      <BottomNav hasSession={!!session} />

      <CartDrawer
        onOrder={() => {
          cart.close();
          setIdentModalOpen(true);
        }}
        onAddToExisting={handleAddToExisting}
      />

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
    <CartProvider>
      <Shell />
    </CartProvider>
  );
}
