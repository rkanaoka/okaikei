import { BRAND, TableHead } from '@/pages/admin/shared';
import type { ExtratoTransaction, ExtratoSyncResultItem, SyncStatus } from './types';

const STATUS_LABEL: Record<SyncStatus, string> = {
  criado: 'Criado',
  ignorado: 'Já existe (ignorado)',
  erro: 'Erro',
};

const STATUS_COLOR: Record<SyncStatus, { bg: string; fg: string }> = {
  criado: { bg: '#e6f1ea', fg: BRAND.green },
  ignorado: { bg: '#e8eef5', fg: '#33587d' },
  erro: { bg: '#fbe9e5', fg: BRAND.red },
};

const money = (v: number | null) =>
  v === null ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface Props {
  rows: ExtratoTransaction[];
  resultsByKey?: Record<string, ExtratoSyncResultItem> | null;
}

export default function PreviewTable({ rows, resultsByKey }: Props) {
  const td: React.CSSProperties = { padding: '8px 12px', whiteSpace: 'nowrap' };
  const cols = ['Data', 'Descrição', 'Entrada R$', 'Saída R$'];

  return (
    <div style={{ overflowX: 'auto', border: '1px solid #e8ecf0', borderRadius: 10 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
        <TableHead cols={resultsByKey ? [...cols, 'Notion'] : cols} />
        <tbody>
          {rows.map((row) => {
            const result = resultsByKey?.[row.chave];
            return (
              <tr key={row.chave} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ ...td, fontWeight: 700, color: BRAND.navy }}>{row.data}</td>
                <td style={{ ...td, whiteSpace: 'normal', minWidth: 220 }}>{row.descricao}</td>
                <td style={{ ...td, color: BRAND.green }}>{money(row.entrada)}</td>
                <td style={{ ...td, color: BRAND.red }}>{money(row.saida)}</td>
                {resultsByKey && (
                  <td style={td}>
                    {result ? (
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 10px',
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 700,
                          background: STATUS_COLOR[result.status].bg,
                          color: STATUS_COLOR[result.status].fg,
                        }}
                        title={result.message}
                      >
                        {STATUS_LABEL[result.status]}
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: '#aaa', fontWeight: 700 }}>Aguardando</span>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
