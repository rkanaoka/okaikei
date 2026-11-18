// Cardápio + vitrine carregados uma vez e compartilhados entre as telas
// (Cardápio, Favoritos, barra inferior), sem recarregar ao trocar de aba.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { menuApi } from './api';
import type { Category, MenuItem, MenuSettings } from './types';

const EMPTY_SETTINGS: MenuSettings = { welcome: null, offers: null, popular: null, ratings: null, favorites: false };

interface MenuContextValue {
  categories: Category[];
  items: MenuItem[];
  settings: MenuSettings;
  loading: boolean;
  error: string;
  reload: () => void;
  categoryNameOf: (item: MenuItem) => string | undefined;
}

const MenuContext = createContext<MenuContextValue | null>(null);

export function MenuProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [settings, setSettings] = useState<MenuSettings>(EMPTY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(() => {
    setLoading(true);
    setError('');
    menuApi
      .getAll()
      .then(({ categories: cats, items: its, settings: st }) => {
        setCategories([...cats].sort((a, b) => a.sortOrder - b.sortOrder));
        setItems(its);
        setSettings({ ...EMPTY_SETTINGS, ...st });
      })
      .catch(() => setError('Não foi possível carregar o cardápio. Verifique sua conexão e tente novamente.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const categoryNameOf = useCallback(
    (item: MenuItem) => categories.find((c) => c.id === item.categoryId || c.id === item.category)?.name,
    [categories]
  );

  const value = useMemo(
    () => ({ categories, items, settings, loading, error, reload, categoryNameOf }),
    [categories, items, settings, loading, error, reload, categoryNameOf]
  );

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
}

export function useMenu(): MenuContextValue {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error('useMenu precisa estar dentro de <MenuProvider>');
  return ctx;
}
