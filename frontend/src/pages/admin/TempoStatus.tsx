import { useState, useEffect } from 'react';
import { comandasApi } from '@/services/api';
import { BRAND, fmtDate, Card, PageHeader, TableHead } from './shared';

export default function TempoStatus() {
  const [loading, setLoading] = useState(true);
  const [data, setData]       = useState<{ number:number; table:string; open:string; closed:string; min:number }[]>([]);

  useEffect(() => {
    (async () => {
      const all: any[] = await comandasApi.list() as unknown as any[];
      const result = all
        .filter(c => c.status==='CLOSED' && c.closedAt)
        .map(c => ({
          number: c.number,
          table:  c.table?.label ?? '—',
          open:   c.openedAt,
          closed: c.closedAt,
          min:    Math.round((new Date(c.closedAt).getTime() - new Date(c.openedAt).getTime()) / 60000),
        }))
        .sort((a,b) => b.min - a.min);
      setData(result);
      setLoading(false);
    })();
  }, []);

  const avg = data.length ? data.reduce((s,d)=>s+d.min, 0)/data.length : 0;

  return (
    <div>
      <PageHeader title="Tempo por Status" subtitle="Duração de atendimento por comanda" />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:24 }}>
        <Card>
          <div style={{ fontSize:11, color:'#999', fontWeight:700, textTransform:'uppercase' }}>Tempo Médio</div>
          <div style={{ fontSize:24, fontWeight:900, color:BRAND.orange, marginTop:6 }}>{Math.round(avg)} min</div>
        </Card>
        <Card>
          <div style={{ fontSize:11, color:'#999', fontWeight:700, textTransform:'uppercase' }}>Mais Longo</div>
          <div style={{ fontSize:24, fontWeight:900, color:BRAND.red, marginTop:6 }}>{data[0]?.min ?? 0} min</div>
        </Card>
        <Card>
          <div style={{ fontSize:11, color:'#999', fontWeight:700, textTransform:'uppercase' }}>Mais Rápido</div>
          <div style={{ fontSize:24, fontWeight:900, color:BRAND.green, marginTop:6 }}>
            {data[data.length-1]?.min ?? 0} min
          </div>
        </Card>
      </div>
      {loading ? <p style={{ color:'#aaa', fontSize:13 }}>Carregando...</p> : (
        <Card style={{ padding:0 }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <TableHead cols={['#','Mesa','Abertura','Fechamento','Duração']} />
            <tbody>
              {data.length === 0 && (
                <tr><td colSpan={5} style={{ padding:'40px', textAlign:'center', color:'#ccc' }}>
                  Nenhum dado disponível
                </td></tr>
              )}
              {data.map((d,i) => (
                <tr key={i} style={{ borderBottom:'1px solid #f0f0f0' }}>
                  <td style={{ padding:'10px 16px', fontWeight:700, color:BRAND.orange }}>#{d.number}</td>
                  <td style={{ padding:'10px 16px', fontWeight:600, color:BRAND.navy }}>{d.table}</td>
                  <td style={{ padding:'10px 16px', color:'#888' }}>{fmtDate(d.open)}</td>
                  <td style={{ padding:'10px 16px', color:'#888' }}>{fmtDate(d.closed)}</td>
                  <td style={{ padding:'10px 16px' }}>
                    <span style={{ fontWeight:800, fontSize:14,
                      color: d.min > 120 ? BRAND.red : d.min > 60 ? BRAND.orange : BRAND.green }}>
                      {d.min} min
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
