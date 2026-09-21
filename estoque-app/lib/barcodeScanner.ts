import { useEffect, useRef } from 'react';

// Leitores Bluetooth simulam teclado (HID) e digitam MUITO mais rápido que um
// humano — usamos o intervalo entre teclas para diferenciar uma leitura real
// de digitação manual, sem exigir que o campo de busca esteja focado.
const MAX_GAP_MS = 50;
const MIN_CODE_LENGTH = 4;

export function useBarcodeScanner(enabled: boolean, onScan: (code: string) => void) {
  const buffer = useRef('');
  const lastKeyTime = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      const now = Date.now();
      if (now - lastKeyTime.current > MAX_GAP_MS) buffer.current = '';
      lastKeyTime.current = now;

      if (e.key === 'Enter') {
        if (buffer.current.length >= MIN_CODE_LENGTH) {
          e.preventDefault();
          const code = buffer.current;
          buffer.current = '';
          onScan(code);
        }
        return;
      }

      if (e.key.length === 1) buffer.current += e.key;
    }

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [enabled, onScan]);
}
