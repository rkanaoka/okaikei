import { useCallback, useEffect, useRef, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/Button';
import { SearchField } from '@/components/SearchField';
import { BottomSheet } from '@/components/BottomSheet';
import { NumericKeypad } from '@/components/NumericKeypad';
import { useToast } from '@/components/ToastProvider';
import { useBarcodeScanner } from '@/lib/barcodeScanner';
import { api, Insumo } from '@/lib/apiClient';
import { formatQuantidade, unidadeLabel, paraQuantidadeBase } from '@/lib/format';

interface ItemConferido {
  insumo: Insumo;
  quantidade: number;
}

export default function ContagemPage() {
  const showToast = useToast();
  const [started, setStarted] = useState(false);
  const [scannerEnabled, setScannerEnabled] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Insumo[]>([]);
  const [selected, setSelected] = useState<Insumo | null>(null);
  const [quantidade, setQuantidade] = useState('');
  const [conferidos, setConferidos] = useState<ItemConferido[]>([]);
  const [salvando, setSalvando] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!started) return;
    const q = query.trim();
    const timer = setTimeout(() => {
      (q ? api.buscarInsumos(q) : api.listarInsumos()).then(setResults).catch(() => setResults([]));
    }, 200);
    return () => clearTimeout(timer);
  }, [query, started]);

  function selecionar(insumo: Insumo) {
    setSelected(insumo);
    setQuantidade('');
  }

  const handleScan = useCallback(async (code: string) => {
    try {
      const found = await api.buscarPorCodigoBarras(code);
      if (found.length === 0) {
        showToast(`Nenhum insumo com o código ${code}.`, 'error');
        return;
      }
      selecionar(found[0]);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useBarcodeScanner(started && scannerEnabled, handleScan);

  async function confirmar() {
    if (!selected) return;
    const qtd = paraQuantidadeBase(quantidade, selected.unidadeBase);
    if (Number.isNaN(qtd) || qtd < 0) {
      showToast('Informe uma quantidade válida.', 'error');
      return;
    }
    setSalvando(true);
    try {
      await api.registrarContagem(selected.id, qtd);
      setConferidos((prev) => [{ insumo: selected, quantidade: qtd }, ...prev]);
      showToast(`${selected.name} conferido.`, 'success');
      setSelected(null);
      setQuantidade('');
      setQuery('');
      setTimeout(() => searchRef.current?.focus(), 50);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSalvando(false);
    }
  }

  if (!started) {
    return (
      <Layout title="Contagem de Estoque">
        <div className="intro">
          <p className="muted">
            Confira o estoque físico item a item. Você pode buscar por nome ou usar um leitor de código de barras
            Bluetooth para agilizar.
          </p>
          <Button onClick={() => setStarted(true)} fullWidth>
            Iniciar Conferência
          </Button>
        </div>
        <style jsx>{`
          .intro {
            display: flex;
            flex-direction: column;
            gap: 20px;
            padding-top: 24px;
          }
          .muted {
            color: var(--color-text-muted);
            line-height: 1.5;
          }
        `}</style>
      </Layout>
    );
  }

  return (
    <Layout title="Contagem de Estoque">
      <div className="toggle-row">
        <span>Leitor de código de barras (BT)</span>
        <label className="switch">
          <input type="checkbox" checked={scannerEnabled} onChange={(e) => setScannerEnabled(e.target.checked)} />
          <span className="slider" />
        </label>
      </div>

      <SearchField
        ref={searchRef}
        scannerActive={scannerEnabled}
        placeholder={scannerEnabled ? 'Aponte o leitor ou digite o nome…' : 'Buscar insumo por nome…'}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />

      <div className="results">
        {results.map((insumo) => (
          <button key={insumo.id} className="result-row" onClick={() => selecionar(insumo)}>
            <span>{insumo.name}</span>
            <span className="muted">
              {formatQuantidade(insumo.estoqueAtual, insumo.unidadeBase)} {unidadeLabel(insumo.unidadeBase)}
            </span>
          </button>
        ))}
      </div>

      {conferidos.length > 0 && (
        <div className="conferidos">
          <h2 className="heading">Conferidos nesta sessão ({conferidos.length})</h2>
          <div className="stack">
            {conferidos.map((c, i) => (
              <div key={i} className="conf-row">
                <span>{c.insumo.name}</span>
                <span className="badge">
                  {formatQuantidade(c.quantidade, c.insumo.unidadeBase)} {unidadeLabel(c.insumo.unidadeBase)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <BottomSheet open={!!selected} onClose={() => setSelected(null)} title={selected?.name}>
        {selected && (
          <div className="qty-form">
            <p className="muted">
              Estoque atual: {formatQuantidade(selected.estoqueAtual, selected.unidadeBase)}{' '}
              {unidadeLabel(selected.unidadeBase)}
            </p>
            <div className={`qty-display ${quantidade === '' ? 'placeholder' : ''}`}>
              {quantidade || `Quantidade contada (${unidadeLabel(selected.unidadeBase)})`}
            </div>
            <NumericKeypad value={quantidade} onChange={setQuantidade} />
            <Button onClick={confirmar} disabled={salvando || quantidade === ''} fullWidth>
              {salvando ? 'Salvando…' : 'Confirmar'}
            </Button>
          </div>
        )}
      </BottomSheet>

      <style jsx>{`
        .toggle-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          font-size: 14px;
          font-weight: 600;
          color: var(--color-navy);
        }
        .switch {
          position: relative;
          width: 48px;
          height: 28px;
        }
        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .slider {
          position: absolute;
          inset: 0;
          background: var(--color-border);
          border-radius: 999px;
          transition: background 0.15s ease;
        }
        .slider::before {
          content: '';
          position: absolute;
          width: 22px;
          height: 22px;
          left: 3px;
          top: 3px;
          background: #fff;
          border-radius: 50%;
          transition: transform 0.15s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        }
        .switch input:checked + .slider {
          background: var(--color-orange);
        }
        .switch input:checked + .slider::before {
          transform: translateX(20px);
        }
        .results {
          margin-top: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .result-row {
          appearance: none;
          border: none;
          text-align: left;
          background: var(--color-surface);
          border-radius: 14px;
          padding: 14px 16px;
          min-height: var(--tap-min);
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: var(--shadow-card);
          font-size: 15px;
          cursor: pointer;
        }
        .muted {
          color: var(--color-text-muted);
          font-size: 13.5px;
        }
        .conferidos {
          margin-top: 26px;
        }
        .heading {
          font-family: var(--font-display);
          font-size: 16px;
          color: var(--color-navy);
          margin: 0 0 10px;
        }
        .stack {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .conf-row {
          display: flex;
          justify-content: space-between;
          background: var(--color-surface);
          border-radius: 12px;
          padding: 10px 14px;
          font-size: 14px;
        }
        .badge {
          font-weight: 700;
          color: var(--color-green);
        }
        .qty-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .qty-display {
          min-height: var(--tap-min);
          border: 2px solid var(--color-border);
          border-radius: 14px;
          padding: 0 16px;
          font-size: 20px;
          font-weight: 700;
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-navy);
        }
        .qty-display.placeholder {
          font-weight: 400;
          font-size: 14px;
          color: var(--color-text-muted);
        }
      `}</style>
    </Layout>
  );
}
