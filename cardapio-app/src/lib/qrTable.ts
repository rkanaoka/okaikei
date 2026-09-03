// Mesa identificada via QR Code (link gerado em Admin > Mesas e Comandas).
// Guardado na sessão do navegador (não sobrevive ao fechar a aba) — diferente
// do "Session" de comanda em curso, que usa localStorage.
const KEY = 'bdg_qr_table';

export interface QrTable {
  tableId: string;
  label: string;
}

/** Lê `?mesa=<id>&label=<label>` da URL, se presente, e guarda na sessão. */
export function captureQrTableFromUrl(): void {
  const params = new URLSearchParams(window.location.search);
  const tableId = params.get('mesa');
  if (!tableId) return;

  const label = params.get('label') ?? '';
  sessionStorage.setItem(KEY, JSON.stringify({ tableId, label }));

  // Remove os parâmetros da URL visível, sem recarregar a página
  params.delete('mesa');
  params.delete('label');
  const rest = params.toString();
  window.history.replaceState({}, '', window.location.pathname + (rest ? `?${rest}` : ''));
}

export function getQrTable(): QrTable | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as QrTable) : null;
  } catch {
    return null;
  }
}

export function clearQrTable(): void {
  sessionStorage.removeItem(KEY);
}
