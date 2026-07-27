import { BRAND, fmtBRL, TableHead } from '@/pages/admin/shared';
import type { FaturamentoRow, SyncResultItem, SyncStatus } from './types';

const STATUS_LABEL: Record<SyncStatus, string> = {
  criado: 'Criado',
  atualizado: 'Atualizado',
  erro: 'Erro',
};

const STATUS_COLOR: Record<SyncStatus, { bg: string; fg: string }> = {
  criado: { bg: '#e6f1ea', fg: BRAND.green },
  atualizado: { bg: '#e8eef5', fg: '#33587d' },
  erro: { bg: '#fbe9e5', fg: BRAND.red },
};

interface Props {
  rows: FaturamentoRow[];
  resultsByDate?: Record<string, SyncResultItem> | null;
}

const cols = [
  'Data', 'Dia', 'Vendas', 'Valor de Vendas', 'Valor Acumulado', 'Ticket Médio',
  'Total dos Itens', 'Taxa Entrega', 'Taxa Serviço', 'Acréscimos', 'Descontos',
  'Vendas Canc.', 'Valor Vendas Canc.',
];

export default function PreviewTable({ rows, resultsByDate }: Props) {
  const td: React.CSSProperties = { padding: '8px 12px', whiteSpace: 'nowrap' };

  return (
    <div style={{ overflowX: 'auto', border: '1px solid #e8ecf0', borderRadius: 10 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
        <TableHead cols={resultsByDate ? [...cols, 'Notion'] : cols} />
        <tbody>
          {rows.map((row) => {
            const result = resultsByDate?.[row.data];
            return (
              <tr key={row.data} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ ...td, fontWeight: 700, color: BRAND.navy }}>{row.data}</td>
                <td style={td}>{row.diaSemana}</td>
                <td style={td}>{row.vendas}</td>
                <td style={td}>{fmtBRL(row.valorDeVendas)}</td>
                <td style={td}>{fmtBRL(row.valorAcumulado)}</td>
                <td style={td}>{fmtBRL(row.ticketMedio)}</td>
                <td style={td}>{fmtBRL(row.totalDosItens)}</td>
                <td style={td}>{fmtBRL(row.taxaDeEntrega)}</td>
                <td style={td}>{fmtBRL(row.taxaDeServico)}</td>
                <td style={td}>{fmtBRL(row.acrescimos)}</td>
                <td style={td}>{fmtBRL(row.descontos)}</td>
                <td style={td}>{row.vendasCanceladas}</td>
                <td style={td}>{fmtBRL(row.valorDeVendasCanceladas)}</td>
                {resultsByDate && (
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
