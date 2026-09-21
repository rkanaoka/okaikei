import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { api, Insumo, Movimentacao } from '@/lib/apiClient';
import { formatQuantidade, unidadeLabel, formatDataHora, TIPO_LABEL } from '@/lib/format';

export default function DashboardPage() {
  const [alertas, setAlertas] = useState<Insumo[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.alertas(), api.movimentacoes(20)])
      .then(([a, m]) => {
        setAlertas(a);
        setMovimentacoes(m);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function severidade(insumo: Insumo): 'critico' | 'atencao' {
    const atual = Number(insumo.estoqueAtual);
    const minimo = Number(insumo.estoqueMinimo);
    return atual <= minimo * 0.5 ? 'critico' : 'atencao';
  }

  return (
    <Layout title="Início">
      {error && <p className="error">{error}</p>}

      <section className="section">
        <h2 className="heading">Abaixo do estoque mínimo</h2>
        {loading && <p className="muted">Carregando…</p>}
        {!loading && !error && alertas.length === 0 && <p className="muted">Tudo certo — nenhum item crítico.</p>}
        <div className="stack">
          {alertas.map((item) => {
            const sev = severidade(item);
            return (
              <div key={item.id} className={`alert-card ${sev}`}>
                <div className="alert-main">
                  <strong>{item.name}</strong>
                  <span className="qty">
                    {formatQuantidade(item.estoqueAtual, item.unidadeBase)} {unidadeLabel(item.unidadeBase)}
                    <span className="min">
                      {' '}
                      / mín. {formatQuantidade(item.estoqueMinimo ?? 0, item.unidadeBase)} {unidadeLabel(item.unidadeBase)}
                    </span>
                  </span>
                </div>
                <span className={`badge ${sev}`}>{sev === 'critico' ? 'Crítico' : 'Atenção'}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="section">
        <h2 className="heading">Alterações recentes</h2>
        {!loading && !error && movimentacoes.length === 0 && (
          <p className="muted">Sem movimentações registradas ainda.</p>
        )}
        <div className="stack">
          {movimentacoes.map((mov) => (
            <div key={mov.id} className="mov-row">
              <div className={`mov-icon mov-${mov.tipo.toLowerCase()}`}>
                {mov.tipo === 'ENTRADA' ? '↓' : mov.tipo === 'SAIDA' ? '↑' : '≈'}
              </div>
              <div className="mov-main">
                <strong>{mov.insumo.name}</strong>
                <span className="muted small">
                  {TIPO_LABEL[mov.tipo] ?? mov.tipo} · {formatQuantidade(mov.quantidade, mov.insumo.unidadeBase)}{' '}
                  {unidadeLabel(mov.insumo.unidadeBase)}
                </span>
              </div>
              <span className="mov-time">{formatDataHora(mov.createdAt)}</span>
            </div>
          ))}
        </div>
      </section>

      <style jsx>{`
        .error {
          color: var(--color-red);
          font-weight: 600;
        }
        .section {
          margin-bottom: 28px;
        }
        .heading {
          font-family: var(--font-display);
          font-size: 17px;
          color: var(--color-navy);
          margin: 0 0 10px;
        }
        .muted {
          color: var(--color-text-muted);
          font-size: 14px;
        }
        .small {
          font-size: 12.5px;
        }
        .stack {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .alert-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          background: var(--color-surface);
          border-radius: 16px;
          padding: 14px 16px;
          box-shadow: var(--shadow-card);
          border-left: 5px solid var(--color-yellow);
        }
        .alert-card.critico {
          border-left-color: var(--color-red);
        }
        .alert-main {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .qty {
          font-size: 13.5px;
          color: var(--color-text-muted);
        }
        .min {
          opacity: 0.8;
        }
        .badge {
          flex-shrink: 0;
          padding: 6px 12px;
          border-radius: var(--radius-pill);
          font-size: 12px;
          font-weight: 700;
          color: #fff;
          background: var(--color-orange);
        }
        .badge.critico {
          background: var(--color-red);
        }
        .mov-row {
          display: flex;
          align-items: center;
          gap: 12px;
          background: var(--color-surface);
          border-radius: 16px;
          padding: 12px 16px;
          box-shadow: var(--shadow-card);
        }
        .mov-icon {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          color: #fff;
          flex-shrink: 0;
          background: var(--color-navy);
        }
        .mov-entrada {
          background: var(--color-green);
        }
        .mov-saida {
          background: var(--color-red);
        }
        .mov-ajuste {
          background: var(--color-orange);
        }
        .mov-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .mov-time {
          font-size: 12px;
          color: var(--color-text-muted);
          flex-shrink: 0;
        }
      `}</style>
    </Layout>
  );
}
