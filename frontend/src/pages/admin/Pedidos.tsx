import { useState, useEffect, useMemo, Fragment } from 'react';
import { comandasApi } from '@/services/api';
import {
  BRAND, fmtBRL, fmtDate, getSubtotal, getTotal, getSurcharge, getDiscount,
  Card, PageHeader, TableHead, PAY_LABELS, PAY_COLORS,
  toSPDateStr, inDateRange, DateRangeFilter, getShiftLabel,
} from './shared';

export default function Pedidos() {
  const [loading, setLoading]     = useState(true);
  const [comandas, setComandas]   = useState<any[]>([]);
  const [expandedId, setExpanded] = useState<string | null>(null);

  const [dateFrom, setDateFrom] = useState(() => toSPDateStr(new Date()));
  const [dateTo, setDateTo]     = useState(() => toSPDateStr(new Date()));

  useEffect(() => {
    comandasApi.list('CLOSED')
      .then((all:any) => setComandas(all as any[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // "Data e hora da venda" = fechamento (quando o pagamento de fato aconteceu),
  // não abertura — por isso o filtro de período e o turno usam closedAt aqui,
  // diferente dos outros relatórios (que analisam por openedAt).
  const filtered = useMemo(() => comandas
    .filter((c:any) => inDateRange(c.closedAt ?? c.openedAt, dateFrom, dateTo))
    .sort((a:any,b:any) => new Date(b.closedAt ?? b.openedAt).getTime() - new Date(a.closedAt ?? a.openedAt).getTime()),
    [comandas, dateFrom, dateTo]
  );

  const totalFaturamento = filtered.reduce((s,c) => s + getTotal(c), 0);

  return (
    <div>
      <PageHeader title="Pedidos" subtitle="Histórico de comandas fechadas" />

      <Card style={{ marginBottom:20 }}>
        <DateRangeFilter from={dateFrom} to={dateTo} onFrom={setDateFrom} onTo={setDateTo} />
      </Card>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:24 }}>
        <Card>
          <div style={{ fontSize:11, color:'#999', fontWeight:700, textTransform:'uppercase' }}>Pedidos no Período</div>
          <div style={{ fontSize:24, fontWeight:900, color:BRAND.navy, marginTop:6 }}>{filtered.length}</div>
        </Card>
        <Card>
          <div style={{ fontSize:11, color:'#999', fontWeight:700, textTransform:'uppercase' }}>Faturamento</div>
          <div style={{ fontSize:24, fontWeight:900, color:BRAND.green, marginTop:6 }}>{fmtBRL(totalFaturamento)}</div>
        </Card>
        <Card>
          <div style={{ fontSize:11, color:'#999', fontWeight:700, textTransform:'uppercase' }}>Ticket Médio</div>
          <div style={{ fontSize:24, fontWeight:900, color:BRAND.orange, marginTop:6 }}>
            {fmtBRL(filtered.length ? totalFaturamento/filtered.length : 0)}
          </div>
        </Card>
      </div>

      {loading ? <p style={{ color:'#aaa', fontSize:13 }}>Carregando...</p> : (
        <Card style={{ padding:0 }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <TableHead cols={['Data/Hora','Comanda','Mesa','Pagamento','Garçom','Turno','Subtotal','Taxa/Acréscimo','Desconto','Total']} />
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={10} style={{ padding:'40px', textAlign:'center', color:'#ccc' }}>
                  Nenhum pedido no período selecionado
                </td></tr>
              )}
              {filtered.map((c:any) => {
                const isOpen    = expandedId === c.id;
                const subtotal  = getSubtotal(c);
                const surcharge = getSurcharge(c);
                const discount  = getDiscount(c);
                const total     = getTotal(c);
                const saleDate  = c.closedAt ?? c.openedAt;
                return (
                  <Fragment key={c.id}>
                    <tr
                      onClick={() => setExpanded(isOpen ? null : c.id)}
                      style={{ borderBottom: isOpen ? 'none' : '1px solid #f0f0f0', cursor:'pointer', background: isOpen ? '#FF6B2B08' : 'transparent' }}>
                      <td style={{ padding:'10px 16px', color:'#888' }}>{fmtDate(saleDate)}</td>
                      <td style={{ padding:'10px 16px', fontWeight:700, color:BRAND.navy }}>
                        #{c.number} {c.customerName ? `— ${c.customerName}` : ''}
                      </td>
                      <td style={{ padding:'10px 16px' }}>{c.table?.label ?? '—'}</td>
                      <td style={{ padding:'10px 16px' }}>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                          {(c.payments ?? []).map((p:any, i:number) => (
                            <span key={i} style={{
                              fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:999,
                              background:`${PAY_COLORS[p.method] ?? '#999'}18`, color: PAY_COLORS[p.method] ?? '#666',
                            }}>
                              {PAY_LABELS[p.method] ?? p.method} {fmtBRL(p.amount)}
                            </span>
                          ))}
                          {!(c.payments?.length) && <span style={{ color:'#ccc' }}>—</span>}
                        </div>
                      </td>
                      <td style={{ padding:'10px 16px' }}>{c.closedByGarcom?.name ?? '—'}</td>
                      <td style={{ padding:'10px 16px', color:'#666' }}>{getShiftLabel(saleDate)}</td>
                      <td style={{ padding:'10px 16px' }}>{fmtBRL(subtotal)}</td>
                      <td style={{ padding:'10px 16px', color: surcharge > 0 ? BRAND.green : '#ccc' }}>{surcharge > 0 ? fmtBRL(surcharge) : '—'}</td>
                      <td style={{ padding:'10px 16px', color: discount > 0 ? BRAND.red : '#ccc' }}>{discount > 0 ? `-${fmtBRL(discount)}` : '—'}</td>
                      <td style={{ padding:'10px 16px', fontWeight:900, color:BRAND.navy }}>{fmtBRL(total)}</td>
                    </tr>
                    {isOpen && (
                      <tr key={`${c.id}-detail`} style={{ borderBottom:'1px solid #f0f0f0' }}>
                        <td colSpan={10} style={{ padding:'0 16px 16px', background:'#FF6B2B08' }}>
                          <div style={{ background:'#fff', borderRadius:10, border:'1px solid #eee', overflow:'hidden' }}>
                            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                              <TableHead cols={['Item','Qtd.','Preço Unit.','Subtotal','Status']} />
                              <tbody>
                                {(c.items ?? []).map((item:any) => (
                                  <tr key={item.id} style={{ borderBottom:'1px solid #f5f5f5' }}>
                                    <td style={{ padding:'8px 14px', fontWeight:600, color:BRAND.navy }}>
                                      {item.menuItem?.name ?? '?'}
                                      {item.notes && <div style={{ fontSize:11, color:BRAND.orange, marginTop:2 }}>📝 {item.notes}</div>}
                                    </td>
                                    <td style={{ padding:'8px 14px' }}>{item.quantity}</td>
                                    <td style={{ padding:'8px 14px' }}>{fmtBRL(item.unitPrice)}</td>
                                    <td style={{ padding:'8px 14px', fontWeight:700 }}>{fmtBRL(item.quantity * parseFloat(item.unitPrice))}</td>
                                    <td style={{ padding:'8px 14px' }}>
                                      <span style={{
                                        fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:999,
                                        background: item.status === 'CANCELLED' ? '#E6394618' : '#2DC65318',
                                        color:       item.status === 'CANCELLED' ? BRAND.red    : BRAND.green,
                                      }}>
                                        {item.status === 'CANCELLED' ? 'Cancelado' : item.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                                {!(c.items?.length) && (
                                  <tr><td colSpan={5} style={{ padding:'16px', textAlign:'center', color:'#ccc' }}>Sem itens</td></tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
