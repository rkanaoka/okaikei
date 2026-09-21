import { useCallback, useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/Button';
import { SearchField } from '@/components/SearchField';
import { BottomSheet } from '@/components/BottomSheet';
import { NumericKeypad } from '@/components/NumericKeypad';
import { useToast } from '@/components/ToastProvider';
import { useBarcodeScanner } from '@/lib/barcodeScanner';
import { api, Insumo } from '@/lib/apiClient';
import { formatQuantidade, unidadeLabel, paraQuantidadeBase, unidadeTrabalhoFator } from '@/lib/format';

type Modo = 'manual' | 'agil';

interface ItemRetirada {
  insumo: Insumo;
  quantidade: number;
}

export default function RetiradaPage() {
  const showToast = useToast();
  const [modo, setModo] = useState<Modo>('manual');
  const [itens, setItens] = useState<Record<string, ItemRetirada>>({});
  const [reviewing, setReviewing] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  // ── Modo manual ──────────────────────────────────────────────────────────────
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Insumo[]>([]);
  const [selected, setSelected] = useState<Insumo | null>(null);
  const [quantidade, setQuantidade] = useState('');

  // ── Edição de item já adicionado à lista ─────────────────────────────────────
  const [editando, setEditando] = useState<ItemRetirada | null>(null);
  const [editQuantidade, setEditQuantidade] = useState('');

  useEffect(() => {
    if (modo !== 'manual') return;
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      const isBarcode = /^\d{4,}$/.test(q);
      (isBarcode ? api.buscarPorCodigoBarras(q) : api.buscarInsumos(q)).then(setResults).catch(() => setResults([]));
    }, 200);
    return () => clearTimeout(timer);
  }, [query, modo]);

  function adicionarManual() {
    if (!selected) return;
    const qtd = paraQuantidadeBase(quantidade, selected.unidadeBase);
    if (Number.isNaN(qtd) || qtd <= 0) {
      showToast('Informe uma quantidade maior que zero.', 'error');
      return;
    }
    acumular(selected, qtd);
    setSelected(null);
    setQuantidade('');
    setQuery('');
  }

  // ── Modo ágil (leitor BT) ──────────────────────────────────────────────────────
  const handleScan = useCallback(async (code: string) => {
    try {
      const found = await api.buscarPorCodigoBarras(code);
      if (found.length === 0) {
        showToast(`Nenhum insumo com o código ${code}.`, 'error');
        return;
      }
      const incremento = unidadeTrabalhoFator(found[0].unidadeBase);
      acumular(found[0], incremento);
      showToast(`+${formatQuantidade(incremento, found[0].unidadeBase)} ${unidadeLabel(found[0].unidadeBase)} ${found[0].name}`, 'info');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useBarcodeScanner(modo === 'agil' && !reviewing, handleScan);

  function acumular(insumo: Insumo, quantidade: number) {
    setItens((prev) => {
      const existente = prev[insumo.id];
      return {
        ...prev,
        [insumo.id]: { insumo, quantidade: (existente?.quantidade ?? 0) + quantidade },
      };
    });
  }

  function removerItem(insumoId: string) {
    setItens((prev) => {
      const next = { ...prev };
      delete next[insumoId];
      return next;
    });
  }

  function abrirEdicao(item: ItemRetirada) {
    setEditando(item);
    const emUnidadeTrabalho = item.quantidade / unidadeTrabalhoFator(item.insumo.unidadeBase);
    setEditQuantidade(String(emUnidadeTrabalho).replace('.', ','));
  }

  function salvarEdicao() {
    if (!editando) return;
    const qtd = paraQuantidadeBase(editQuantidade, editando.insumo.unidadeBase);
    if (Number.isNaN(qtd) || qtd <= 0) {
      showToast('Informe uma quantidade maior que zero.', 'error');
      return;
    }
    setItens((prev) => ({ ...prev, [editando.insumo.id]: { insumo: editando.insumo, quantidade: qtd } }));
    setEditando(null);
  }

  function removerDaEdicao() {
    if (!editando) return;
    removerItem(editando.insumo.id);
    setEditando(null);
  }

  function cancelarTudo() {
    setItens({});
    setReviewing(false);
    setSelected(null);
    setQuery('');
  }

  async function confirmarSaida() {
    setConfirmando(true);
    try {
      await api.registrarSaida(Object.values(itens).map((i) => ({ insumo_id: i.insumo.id, quantidade: i.quantidade })));
      showToast('Saída confirmada.', 'success');
      cancelarTudo();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setConfirmando(false);
    }
  }

  const listaItens = Object.values(itens);

  if (reviewing) {
    return (
      <Layout title="Revisar Saída">
        <div className="stack">
          {listaItens.map((i) => (
            <div key={i.insumo.id} className="review-row">
              <span>{i.insumo.name}</span>
              <span className="badge">
                {formatQuantidade(i.quantidade, i.insumo.unidadeBase)} {unidadeLabel(i.insumo.unidadeBase)}
              </span>
            </div>
          ))}
        </div>
        <div className="actions">
          <Button variant="ghost" onClick={() => setReviewing(false)} fullWidth>
            Voltar
          </Button>
          <Button onClick={confirmarSaida} disabled={confirmando || listaItens.length === 0} fullWidth>
            {confirmando ? 'Confirmando…' : 'Confirmar Saída'}
          </Button>
          <Button variant="danger" onClick={cancelarTudo} fullWidth>
            Cancelar
          </Button>
        </div>
        <style jsx>{`
          .stack {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-bottom: 20px;
          }
          .review-row {
            display: flex;
            justify-content: space-between;
            background: var(--color-surface);
            border-radius: 14px;
            padding: 14px 16px;
            box-shadow: var(--shadow-card);
          }
          .badge {
            font-weight: 700;
            color: var(--color-navy);
          }
          .actions {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
        `}</style>
      </Layout>
    );
  }

  return (
    <Layout title="Retirada de Insumo">
      <div className="segmented">
        <button className={modo === 'manual' ? 'active' : ''} onClick={() => setModo('manual')}>
          Manual
        </button>
        <button className={modo === 'agil' ? 'active' : ''} onClick={() => setModo('agil')}>
          Modo Ágil — BT
        </button>
      </div>

      {modo === 'manual' ? (
        <>
          <SearchField
            placeholder="Buscar por nome ou código de barras…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="results">
            {results.map((insumo) => (
              <button
                key={insumo.id}
                className="result-row"
                onClick={() => setSelected(insumo)}
              >
                <span>{insumo.name}</span>
                <span className="muted">
                  {formatQuantidade(insumo.estoqueAtual, insumo.unidadeBase)} {unidadeLabel(insumo.unidadeBase)}
                </span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="agil-banner">
          <span className="pulse">📡</span>
          <p>Leitor Bluetooth em escuta. Cada leitura soma +1 ao item.</p>
        </div>
      )}

      {listaItens.length > 0 && (
        <div className="pending">
          <h2 className="heading">Itens a retirar ({listaItens.length})</h2>
          <div className="stack">
            {listaItens.map((i) => (
              <button key={i.insumo.id} className="pend-row" onClick={() => abrirEdicao(i)}>
                <span>{i.insumo.name}</span>
                <span className="pend-right">
                  <strong>
                    {formatQuantidade(i.quantidade, i.insumo.unidadeBase)} {unidadeLabel(i.insumo.unidadeBase)}
                  </strong>
                  <span
                    className="remove"
                    role="button"
                    aria-label="Remover"
                    onClick={(e) => {
                      e.stopPropagation();
                      removerItem(i.insumo.id);
                    }}
                  >
                    ✕
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="footer-actions">
        <Button onClick={() => setReviewing(true)} disabled={listaItens.length === 0} fullWidth>
          Finalizar e Revisar
        </Button>
        {listaItens.length > 0 && (
          <Button variant="ghost" onClick={cancelarTudo} fullWidth>
            Cancelar
          </Button>
        )}
      </div>

      <BottomSheet open={!!selected} onClose={() => setSelected(null)} title={selected?.name}>
        {selected && (
          <div className="qty-form">
            <div className={`qty-display ${quantidade === '' ? 'placeholder' : ''}`}>
              {quantidade || `Quantidade a retirar (${unidadeLabel(selected.unidadeBase)})`}
            </div>
            <NumericKeypad value={quantidade} onChange={setQuantidade} />
            <Button onClick={adicionarManual} disabled={quantidade === ''} fullWidth>
              Adicionar à lista
            </Button>
          </div>
        )}
      </BottomSheet>

      <BottomSheet open={!!editando} onClose={() => setEditando(null)} title={editando?.insumo.name}>
        {editando && (
          <div className="qty-form">
            <p className="muted">Editar quantidade a retirar ({unidadeLabel(editando.insumo.unidadeBase)})</p>
            <div className={`qty-display ${editQuantidade === '' ? 'placeholder' : ''}`}>
              {editQuantidade || '0'}
            </div>
            <NumericKeypad value={editQuantidade} onChange={setEditQuantidade} />
            <Button onClick={salvarEdicao} disabled={editQuantidade === ''} fullWidth>
              Salvar
            </Button>
            <Button variant="danger" onClick={removerDaEdicao} fullWidth>
              Remover da lista
            </Button>
          </div>
        )}
      </BottomSheet>

      <style jsx>{`
        .segmented {
          display: flex;
          background: var(--color-surface);
          border-radius: var(--radius-pill);
          padding: 4px;
          margin-bottom: 14px;
          box-shadow: var(--shadow-card);
        }
        .segmented button {
          flex: 1;
          appearance: none;
          border: none;
          background: transparent;
          padding: 10px 0;
          min-height: var(--tap-min);
          border-radius: var(--radius-pill);
          font-weight: 700;
          font-size: 14px;
          color: var(--color-text-muted);
          cursor: pointer;
        }
        .segmented button.active {
          background: var(--gradient-warm);
          color: #fff;
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
        .agil-banner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          text-align: center;
          background: var(--color-navy);
          color: #fff;
          border-radius: 18px;
          padding: 28px 20px;
        }
        .pulse {
          font-size: 32px;
          animation: pulse 1.4s ease-in-out infinite;
        }
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.4;
          }
        }
        .pending {
          margin-top: 22px;
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
        .pend-row {
          appearance: none;
          border: none;
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--color-surface);
          border-radius: 12px;
          padding: 10px 14px;
          font-size: 14px;
          font-family: inherit;
          text-align: left;
          color: var(--color-text);
          cursor: pointer;
          box-shadow: var(--shadow-card);
        }
        .pend-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .remove {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(230, 57, 70, 0.1);
          color: var(--color-red);
          width: 28px;
          height: 28px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 13px;
        }
        .footer-actions {
          margin-top: 22px;
          display: flex;
          flex-direction: column;
          gap: 10px;
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
