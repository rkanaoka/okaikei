import { useState, useEffect, useCallback } from 'react';
import { comandasApi } from '@/services/api';
import { BRAND, fmtBRL, fmtDate, PAY_LABELS, PAY_COLORS, todayStart, getSubtotal, getTotal, Card, PageHeader, Btn, TableHead } from './shared';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [all, setAll]         = useState<any[]>([]);

  const load = useCallback(async () => {
    try { setAll(await comandasApi.list() as unknown as any[]); }
    catch(e) {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const start   = todayStart();
  const today   = all.filter(c => new Date(c.openedAt) >= start);
  const closed  = today.filter(c => c.status === 'CLOSED');
  const open    = today.filter(c => c.status !== 'CLOSED');
  const revenue = closed.reduce((s, c) => s + getTotal(c), 0);

  const payByMethod: Record<string,number> = {};
  for (const c of closed)
    for (const p of (c.payments ?? []))
      payByMethod[p.method] = (payByMethod[p.method] ?? 0) + parseFloat(p.amount);

  const itemMap: Record<string,{ name:string; qty:number; total:number }> = {};
  for (const c of closed)
    for (const item of (c.items ?? [])) {
      const name = item.menuItem?.name ?? item.name ?? '?';
      if (!itemMap[name]) itemMap[name] = { name, qty:0, total:0 };
      itemMap[name].qty   += item.quantity;
      itemMap[name].total += item.quantity * parseFloat(item.unitPrice);
    }
  const itemsSold = Object.values(itemMap).sort((a,b) => b.qty - a.qty);

  const totalItems = closed.reduce((s,c) => (c.items??[]).reduce((ss:number,i:any) => ss+i.quantity, 0)+s, 0);

  if (loading) return <div style={{ padding:40, color:'#888', fontSize:14 }}>Carregando...</div>;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`Hoje, ${new Date().toLocaleDateString('pt-BR',{ weekday:'long', day:'2-digit', month:'long' })}`}
        action={
          <Btn variant="ghost" small onClick={load}>↻ Atualizar</Btn>
        }
      />

      {/* KPI row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        {[
          { label:'Faturamento do Dia',   value:fmtBRL(revenue),  sub:`${closed.length} comanda(s) fechada(s)`, color:BRAND.green  },
          { label:'Ticket Médio',         value:fmtBRL(closed.length ? revenue/closed.length : 0), sub:'por comanda fechada', color:BRAND.orange },
          { label:'Comandas em Aberto',   value:String(open.length), sub:fmtBRL(open.reduce((s,c)=>s+getSubtotal(c),0))+' pendente', color:BRAND.navy },
          { label:'Itens Vendidos',       value:String(totalItems),  sub:'itens hoje', color:'#5c6bc0' },
        ].map(k => (
          <Card key={k.label}>
            <div style={{ fontSize:11, fontWeight:700, color:'#999', textTransform:'uppercase', letterSpacing:.5 }}>{k.label}</div>
            <div style={{ fontSize:26, fontWeight:900, color:k.color, margin:'6px 0 4px' }}>{k.value}</div>
            <div style={{ fontSize:11, color:'#bbb' }}>{k.sub}</div>
          </Card>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:24 }}>
        {/* Pagamentos por forma */}
        <Card>
          <h3 style={{ margin:'0 0 16px', fontSize:15, fontWeight:800, color:BRAND.navy }}>Pagamentos por Forma</h3>
          {Object.keys(payByMethod).length === 0
            ? <p style={{ color:'#ccc', fontSize:13, margin:0 }}>Nenhum pagamento registrado hoje</p>
            : <>
                {Object.entries(payByMethod).map(([method, amount]) => (
                  <div key={method} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                    padding:'10px 0', borderBottom:'1px solid #f5f5f5' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:10, height:10, borderRadius:'50%', background:PAY_COLORS[method]??'#999' }} />
                      <span style={{ fontWeight:700, fontSize:14, color:BRAND.navy }}>{PAY_LABELS[method]??method}</span>
                    </div>
                    <span style={{ fontWeight:800, fontSize:15, color:BRAND.navy }}>{fmtBRL(amount)}</span>
                  </div>
                ))}
                <div style={{ display:'flex', justifyContent:'space-between', padding:'12px 0 0' }}>
                  <span style={{ fontWeight:700, color:'#888', fontSize:12, textTransform:'uppercase' }}>Total</span>
                  <span style={{ fontWeight:900, fontSize:16, color:BRAND.green }}>{fmtBRL(revenue)}</span>
                </div>
              </>
          }
        </Card>

        {/* Itens mais vendidos */}
        <Card>
          <h3 style={{ margin:'0 0 16px', fontSize:15, fontWeight:800, color:BRAND.navy }}>Itens Mais Vendidos Hoje</h3>
          {itemsSold.length === 0
            ? <p style={{ color:'#ccc', fontSize:13, margin:0 }}>Nenhum item vendido hoje</p>
            : itemsSold.slice(0,8).map((item,idx) => (
                <div key={item.name} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                  padding:'7px 0', borderBottom:'1px solid #f5f5f5' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:11, fontWeight:800, color:'#ccc', width:18 }}>#{idx+1}</span>
                    <span style={{ fontSize:13, color:BRAND.navy, fontWeight:600 }}>{item.name}</span>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:13, fontWeight:800, color:BRAND.orange }}>{item.qty}×</div>
                    <div style={{ fontSize:11, color:'#aaa' }}>{fmtBRL(item.total)}</div>
                  </div>
                </div>
              ))
          }
        </Card>
      </div>

      {/* Histórico */}
      <Card style={{ padding:0, overflow:'hidden' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid #f0f0f0' }}>
          <h3 style={{ margin:0, fontSize:15, fontWeight:800, color:BRAND.navy }}>Histórico de Pedidos — Hoje</h3>
        </div>
        {closed.length === 0
          ? <p style={{ color:'#ccc', fontSize:13, padding:'32px 20px', margin:0 }}>Nenhum pedido fechado hoje</p>
          : <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <TableHead cols={['#','Mesa','Cliente','Abertura','Fechamento','Itens','Total','Pagamento']} />
              <tbody>
                {[...closed].reverse().map(c => (
                  <tr key={c.id} style={{ borderBottom:'1px solid #f7f7f7' }}>
                    <td style={{ padding:'10px 16px', fontWeight:700, color:BRAND.orange }}>#{c.number}</td>
                    <td style={{ padding:'10px 16px', fontWeight:600, color:BRAND.navy }}>{c.table?.label??'—'}</td>
                    <td style={{ padding:'10px 16px', color:'#666' }}>{c.customerName??'—'}</td>
                    <td style={{ padding:'10px 16px', color:'#999' }}>{fmtDate(c.openedAt)}</td>
                    <td style={{ padding:'10px 16px', color:'#999' }}>{c.closedAt ? fmtDate(c.closedAt) : '—'}</td>
                    <td style={{ padding:'10px 16px', textAlign:'center' }}>{(c.items??[]).reduce((s:number,i:any)=>s+i.quantity,0)}</td>
                    <td style={{ padding:'10px 16px', fontWeight:800, color:BRAND.green }}>{fmtBRL(getTotal(c))}</td>
                    <td style={{ padding:'10px 16px' }}>
                      {(c.payments??[]).map((p:any) => (
                        <span key={p.id} style={{ fontSize:11, fontWeight:700,
                          color:PAY_COLORS[p.method]??'#999', background:'#f5f5f5',
                          borderRadius:4, padding:'2px 6px', marginRight:4 }}>
                          {PAY_LABELS[p.method]??p.method}
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </Card>
    </div>
  );
}
