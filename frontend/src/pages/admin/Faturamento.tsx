import { useState, useEffect } from 'react';
import { comandasApi } from '@/services/api';
import { BRAND, fmtBRL, getTotal, Card, PageHeader, TableHead } from './shared';

export default function Faturamento() {
  const [loading, setLoading] = useState(true);
  const [byDay, setByDay]     = useState<{ date:string; count:number; total:number }[]>([]);

  useEffect(() => {
    (async () => {
      const all: any[] = await comandasApi.list() as unknown as any[];
      const closed = all.filter(c => c.status === 'CLOSED');
      const map: Record<string,{ count:number; total:number }> = {};
      for (const c of closed) {
        const day = new Date(c.openedAt).toLocaleDateString('pt-BR', { timeZone:'America/Sao_Paulo' });
        if (!map[day]) map[day] = { count:0, total:0 };
        map[day].count++;
        map[day].total += getTotal(c);
      }
      setByDay(Object.entries(map).map(([date,v])=>({date,...v})).sort((a,b)=>b.date.localeCompare(a.date)));
      setLoading(false);
    })();
  }, []);

  const grand = byDay.reduce((s,d)=>s+d.total, 0);

  return (
    <div>
      <PageHeader title="Faturamento por Dia" subtitle="Histórico de receita diária" />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:24 }}>
        <Card>
          <div style={{ fontSize:11, color:'#999', fontWeight:700, textTransform:'uppercase' }}>Total Acumulado</div>
          <div style={{ fontSize:24, fontWeight:900, color:BRAND.green, marginTop:6 }}>{fmtBRL(grand)}</div>
        </Card>
        <Card>
          <div style={{ fontSize:11, color:'#999', fontWeight:700, textTransform:'uppercase' }}>Média Diária</div>
          <div style={{ fontSize:24, fontWeight:900, color:BRAND.orange, marginTop:6 }}>
            {fmtBRL(byDay.length ? grand/byDay.length : 0)}
          </div>
        </Card>
        <Card>
          <div style={{ fontSize:11, color:'#999', fontWeight:700, textTransform:'uppercase' }}>Dias com Movimento</div>
          <div style={{ fontSize:24, fontWeight:900, color:BRAND.navy, marginTop:6 }}>{byDay.length}</div>
        </Card>
      </div>
      {loading ? <p style={{ color:'#aaa', fontSize:13 }}>Carregando...</p> : (
        <Card style={{ padding:0 }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <TableHead cols={['Data','Comandas Fechadas','Faturamento','Ticket Médio']} />
            <tbody>
              {byDay.length === 0 && (
                <tr><td colSpan={4} style={{ padding:'40px', textAlign:'center', color:'#ccc' }}>
                  Sem dados de faturamento
                </td></tr>
              )}
              {byDay.map(d => (
                <tr key={d.date} style={{ borderBottom:'1px solid #f0f0f0' }}>
                  <td style={{ padding:'10px 16px', fontWeight:700, color:BRAND.navy }}>{d.date}</td>
                  <td style={{ padding:'10px 16px', textAlign:'center', fontWeight:700 }}>{d.count}</td>
                  <td style={{ padding:'10px 16px', fontWeight:800, color:BRAND.green }}>{fmtBRL(d.total)}</td>
                  <td style={{ padding:'10px 16px', color:'#666' }}>{fmtBRL(d.count ? d.total/d.count : 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
