import { useCallback, useEffect, useState } from 'react';
import { paymentMethodsApi, PaymentMethodRow } from '@/services/api';

// Usados enquanto a lista carrega (ou se a API falhar) — mesmos valores do cadastro inicial.
const FALLBACK_LABELS: Record<string, string> = { CASH: 'Dinheiro', CARD: 'Cartão', PIX: 'Pix', VOUCHER: 'Voucher' };
const FALLBACK_COLORS: Record<string, string> = { CASH: '#2DC653', CARD: '#5c6bc0', PIX: '#00bfa5', VOUCHER: '#FF6B2B' };

// Cache compartilhado entre telas: as formas de pagamento mudam raramente.
let cache: Promise<PaymentMethodRow[]> | null = null;

function fetchAll(force = false) {
  if (!cache || force) {
    cache = paymentMethodsApi.list().catch((err) => { cache = null; throw err; });
  }
  return cache;
}

/** Descarta o cache (chamar após criar/editar uma forma de pagamento). */
export function invalidatePaymentMethods() {
  cache = null;
}

/**
 * Formas de pagamento cadastradas (inclui desativadas, para exibir o histórico).
 * Para opções de novos pagamentos use `activeMethods`.
 */
export function usePaymentMethods() {
  const [methods, setMethods] = useState<PaymentMethodRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const reload = useCallback(async (force = false) => {
    setLoading(true);
    try { setMethods(await fetchAll(force)); setError(null); }
    catch (e: any) { setError(e?.message ?? 'Erro ao carregar formas de pagamento'); /* rótulos usam o fallback */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const labelOf = useCallback(
    (code: string) => methods.find((m) => m.code === code)?.label ?? FALLBACK_LABELS[code] ?? code,
    [methods],
  );
  const colorOf = useCallback(
    (code: string) => methods.find((m) => m.code === code)?.color ?? FALLBACK_COLORS[code] ?? '#999',
    [methods],
  );

  return {
    methods,
    activeMethods: methods.filter((m) => m.active),
    loading,
    error,
    reload: () => reload(true),
    labelOf,
    colorOf,
  };
}
