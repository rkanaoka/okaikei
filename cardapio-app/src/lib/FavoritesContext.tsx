// Favoritos do cliente — ficam só neste aparelho (localStorage), nada vai para o servidor.
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const KEY = 'bdg_favorites';

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

interface FavoritesContextValue {
  ids: string[];
  isFavorite: (id: string) => boolean;
  toggle: (id: string) => boolean; // retorna o novo estado
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>(read);

  const toggle = useCallback((id: string) => {
    const current = read();
    const next = current.includes(id) ? current.filter((x) => x !== id) : [id, ...current];
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* armazenamento indisponível */ }
    setIds(next);
    return next.includes(id);
  }, []);

  const value = useMemo(
    () => ({ ids, isFavorite: (id: string) => ids.includes(id), toggle }),
    [ids, toggle]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites precisa estar dentro de <FavoritesProvider>');
  return ctx;
}
