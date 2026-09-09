import { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { comandasApi } from '@/services/api';
import {
  BRAND, fmtBRL, getTotal, Card, PageHeader, TableHead,
  toSPDateStr, inDateRange, DateRangeFilter, fetchMenuItemInfoMap, GroupToggle, MenuItemInfo,
} from './shared';

export default function Faturamento() {
  const [loading, setLoading]   = useState(true);
  const [comandas, setComandas] = useState<any[]>([]);
  const [menuMap, setMenuMap]   = useState<Map<string, MenuItemInfo>>(new Map());
  const [groupBy, setGroupBy]   = useState<'produto'|'categoria'>('produto');

  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setDate(1); return toSPDateStr(d); });
  const [dateTo, setDateTo]     = useState(() => toSPDateStr(new Date()));

  useEffect(() => {
    setLoading(true);
    Promise.all([comandasApi.list('CLOSED'), fetchMenuItemInfoMap()])
      .then(([all, map]) => { setComandas(all as unknown as any[]); setMenuMap(map); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => comandas.filter((c:any) => inDateRange(c.openedAt, dateFrom, dateTo)),
    [comandas, dateFrom, dateTo]
  );

  const byDay = useMemo(() => {
    const map: Record<string,{ count:number; total:number }> = {};
    for (const c of filtered) {
      const day = new Date(c.openedAt).toLocaleDateString('pt-BR', { timeZone:'America/Sao_Paulo' });
      if (!map[day]) map[day] = { count:0, total:0 };
      map[day].count++;
      map[day].total += getTotal(c);
    }
    return Object.entries(map).map(([date,v]) => ({ date, ...v })).sort((a,b) => b.date.localeCompare(a.date));
  }, [filtered]);

  const chartData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of filtered) {
      for (const item of (c.items ?? [])) {
        if (item.status === 'CANCELLED') continue;
        const info = menuMap.get(item.menuItemId);
        const key = groupBy === 'produto'
          ? (info?.name ?? item.menuItem?.name ?? item.name ?? '?')
          : (info?.categoryName ?? 'Sem categoria');
        map[key] = (map[key] ?? 0) + item.quantity * parseFloat(item.unitPrice);
      }
    }
    const sorted = Object.entries(map).map(([label,total]) => ({ label, total })).sort((a,b) => b.total - a.total);
    return groupBy === 'produto' ? sorted.slice(0, 15) : sorted;
  }, [filtered, menuMap, groupBy]);

  const grand = byDay.reduce((s,d) => s+d.total, 0);

  return (
    <div>
      <PageHeader title="Faturamento por Dia" subtitle="Histórico de receita diária" />

      <Card style={{ marginBottom:20 }}>
        <DateRangeFilter from={dateFrom} to={dateTo} onFrom={setDateFrom} onTo={setDateTo} />
      </Card>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:24 }}>
        <Card>
          <div style={{ fontSize:11, color:'#999', fontWeight:700, textTransform:'uppercase' }}>Total no Período</div>
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

      {!loading && (
        <Card style={{ marginBottom:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <h3 style={{ margin:0, fontSize:15, fontWeight:800, color:BRAND.navy }}>Receita por {groupBy === 'produto' ? 'produto (top 15)' : 'categoria'}</h3>
            <GroupToggle value={groupBy} onChange={setGroupBy} />
          </div>
          {chartData.length === 0 ? (
            <p style={{ color:'#ccc', fontSize:13, textAlign:'center', padding:'30px 0' }}>Sem dados para o período selecionado</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 34)}>
              <BarChart data={chartData} layout="vertical" margin={{ left:10, right:30, top:5, bottom:5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(v)=>fmtBRL(v)} tick={{ fontSize:11 }} />
                <YAxis type="category" dataKey="label" width={150} tick={{ fontSize:12 }} />
                <Tooltip formatter={(v:any)=>fmtBRL(v)} labelStyle={{ fontWeight:700 }} />
                <Bar dataKey="total" fill={BRAND.green} radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      )}

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
