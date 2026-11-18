import type { Session } from './types';

const KEY = 'bdg_session';

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function setSession(s: Session): void {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function clearSession(): void {
  localStorage.removeItem(KEY);
}

/** "5" → "Mesa 5"; rótulos vindos do QR Code ("Mesa 5", "Balcão 2") ficam como estão. */
export function tableDisplay(tableNumber?: string | null): string {
  const t = (tableNumber ?? '').trim();
  if (!t) return '';
  return /^\d+$/.test(t) ? `Mesa ${t}` : t;
}
