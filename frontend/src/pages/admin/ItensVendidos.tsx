import { useState, useEffect } from 'react';
import { comandasApi } from '@/services/api';
import { BRAND, fmtBRL, PRINT_CAT_LABELS, Card, PageHeader, TableHead } from './shared';

export default function ItensVendidos() {
  const [loading, setLoading] = useState(true);
  const [items, setItems]     = useState<{ name:string; qty:number; total:number; category:string }[]>([]);
  const [period, setPeriod]   = useState('today');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const all: any[] = await comandasApi.list() as unknown as any[];
      const now = new Date();
      let from: Date;
      if (period === 'today')  { from = new Date(now); from.setHours(0,0,0,0); }
      else if (period === 'week')  { from = new Date(now); from.setDate(from.getDate()-7); }
      else { from = new Date(now); from.setDate(1); from.setHours(0,0,0,0); }

      const closed = all.filter(c => c.status==='CLOSED' && new Date(c.openedAt) >= from);
      const map: Record<string,any> = {};
      for (const c of closed)
        for (const item of (c.items??[])) {
          const name = item.menuItem?.name ?? item.name ?? '?';
          const cat  = item.menuItem?.category ?? item.category ?? '?';
          if (!map[name]) map[name] = { name, qty:0, total:0, category:cat };
          map[name].qty   += item.quantity;
          map[name].total += item.quantity * parseFloat(item.unitPrice);
        }
      setItems(Object.values(map).sort((a,b)=>b.qty-a.qty));
      setLoading(false);
    })();
  }, [period]);

  return (
    <div>
      <PageHeader
        title="Itens Vendidos"
        subtitle="Ranking de itens do cardápio"
        action={
          <select value={period} onChange={e=>setPeriod(e.target.value)}
            style={{ border:'1.5px solid #ddd', borderRadius:8, padding:'8px 12px', fontSize:13,
              fontWeight:600, cursor:'pointer', outline:'none' }}>
            <option value="today">Hoje</option>
            <option value="week">Últimos 7 dias</option>
            <option value="month">Este mês</option>
          </select>
        }
      />
      {loading ? <p style={{ color:'#aaa', fontSize:13 }}>Carregando...</p> : (
        <Card style={{ padding:0 }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <TableHead cols={['#','Item','Categoria','Qtd. Vendida','Receita Total']} />
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={5} style={{ padding:'40px', textAlign:'center', color:'#ccc' }}>
                  Nenhum item vendido no período
                </td></tr>
              )}
              {items.map((item, idx) => (
                <tr key={item.name} style={{ borderBottom:'1px solid #f0f0f0' }}>
                  <td style={{ padding:'10px 16px', color:'#ccc', fontWeight:700 }}>#{idx+1}</td>
                  <td style={{ padding:'10px 16px', fontWeight:700, color:BRAND.navy }}>{item.name}</td>
                  <td style={{ padding:'10px 16px' }}>
                    <span style={{ background:'#f0f2f5', borderRadius:4, padding:'2px 8px', fontSize:11, fontWeight:700 }}>
                      {PRINT_CAT_LABELS[item.category]??item.category}
                    </span>
                  </td>
                  <td style={{ padding:'10px 16px', fontWeight:900, fontSize:16, color:BRAND.orange }}>{item.qty}</td>
                  <td style={{ padding:'10px 16px', fontWeight:800, color:BRAND.green }}>{fmtBRL(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
