import { useState, useEffect, useMemo } from 'react';
import { comandasApi } from '@/services/api';
import { BRAND, fmtBRL, getSubtotal, getTotal, Card, PageHeader, Btn, TableHead } from './shared';

const WEEKDAY_LABELS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const MONTH_LABELS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

function gorjetaValue(c: any) {
  const sub = getSubtotal(c);
  const v = parseFloat(c.surchargeValue) || 0;
  return c.surchargeType === 'percent' ? sub * v / 100 : v;
}

export default function AcertoGarcons() {
  const [loading, setLoading]   = useState(true);
  const [comandas, setComandas] = useState<any[]>([]);
  const [cursor, setCursor]     = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d; });
  const [selectedDay, setSelectedDay] = useState<number|null>(null);

  useEffect(() => {
    comandasApi.list()
      .then((all: any) => setComandas((all as any[]).filter(c => c.status === 'CLOSED')))
      .catch(()=>{})
      .finally(()=>setLoading(false));
  }, []);

  const year  = cursor.getFullYear();
  const month = cursor.getMonth();

  const monthComandas = useMemo(() => comandas.filter(c => {
    const d = new Date(c.openedAt);
    return d.getFullYear() === year && d.getMonth() === month;
  }), [comandas, year, month]);

  const monthGorjetas = useMemo(() =>
    monthComandas.filter(c => c.surchargeType || parseFloat(c.surchargeValue) > 0),
    [monthComandas]);

  // Contagem e valor de gorjetas por dia do mês
  const byDay = useMemo(() => {
    const map: Record<number, { count:number; total:number }> = {};
    for (const c of monthGorjetas) {
      const day = new Date(c.openedAt).getDate();
      if (!map[day]) map[day] = { count:0, total:0 };
      map[day].count++;
      map[day].total += gorjetaValue(c);
    }
    return map;
  }, [monthGorjetas]);

  const totalGorjeta     = monthGorjetas.reduce((s,c) => s + gorjetaValue(c), 0);
  const totalFaturamento = monthComandas.reduce((s,c) => s + getTotal(c), 0);
  const totalVendas      = monthComandas.length;
  const diasNoPeriodo    = new Date(year, month+1, 0).getDate();

  const daysInMonth  = diasNoPeriodo;
  const firstWeekday = new Date(year, month, 1).getDay();
  const today = new Date();

  const cells: (number|null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length:daysInMonth }, (_,i) => i+1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function changeMonth(delta: number) {
    setCursor(c => { const n = new Date(c); n.setMonth(n.getMonth()+delta); return n; });
    setSelectedDay(null);
  }

  const dayList = selectedDay
    ? monthGorjetas.filter(c => new Date(c.openedAt).getDate() === selectedDay)
    : monthGorjetas;

  return (
    <div>
      <PageHeader title="Acerto de Garçons" subtitle="Gorjetas compulsórias por dia" />

      {/* Calendário */}
      <Card style={{ marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:20, marginBottom:20 }}>
          <button onClick={() => changeMonth(-1)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:BRAND.navy, fontWeight:900 }}>‹</button>
          <div style={{ fontSize:16, fontWeight:800, color:BRAND.navy, minWidth:160, textAlign:'center' }}>
            {MONTH_LABELS[month]} {year}
          </div>
          <button onClick={() => changeMonth(1)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:BRAND.navy, fontWeight:900 }}>›</button>
        </div>

        {loading ? <p style={{ color:'#aaa', fontSize:13, textAlign:'center' }}>Carregando...</p> : (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4, marginBottom:4 }}>
              {WEEKDAY_LABELS.map(w => (
                <div key={w} style={{ textAlign:'center', fontSize:11, fontWeight:700, color:'#999', textTransform:'uppercase', padding:'4px 0' }}>{w}</div>
              ))}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4 }}>
              {cells.map((day, idx) => {
                if (day === null) return <div key={idx} />;
                const info = byDay[day];
                const isToday    = today.getFullYear()===year && today.getMonth()===month && today.getDate()===day;
                const isSelected = selectedDay === day;
                return (
                  <button key={idx} onClick={() => setSelectedDay(s => s===day ? null : day)} style={{
                    aspectRatio:'1', borderRadius:10, cursor:'pointer', fontFamily:'inherit',
                    border: isSelected ? `2px solid ${BRAND.orange}` : isToday ? `2px solid ${BRAND.navy}` : '1px solid #eee',
                    background: isSelected ? '#FF6B2B12' : info ? '#e8f8ee' : '#fff',
                    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2, padding:4,
                  }}>
                    <span style={{ fontSize:12, fontWeight:700, color: isToday ? BRAND.navy : '#555' }}>{day}</span>
                    {info && <span style={{ fontSize:10, fontWeight:900, color:BRAND.green }}>{info.count}</span>}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </Card>

      {/* Totais do período */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        <Card>
          <div style={{ fontSize:11, color:'#999', fontWeight:700, textTransform:'uppercase' }}>Taxas de Serviço (Mês)</div>
          <div style={{ fontSize:24, fontWeight:900, color:BRAND.green, marginTop:6 }}>{fmtBRL(totalGorjeta)}</div>
        </Card>
        <Card>
          <div style={{ fontSize:11, color:'#999', fontWeight:700, textTransform:'uppercase' }}>Faturamento (Mês)</div>
          <div style={{ fontSize:24, fontWeight:900, color:BRAND.navy, marginTop:6 }}>{fmtBRL(totalFaturamento)}</div>
        </Card>
        <Card>
          <div style={{ fontSize:11, color:'#999', fontWeight:700, textTransform:'uppercase' }}>Vendas / Comandas</div>
          <div style={{ fontSize:24, fontWeight:900, color:BRAND.orange, marginTop:6 }}>{totalVendas}</div>
        </Card>
        <Card>
          <div style={{ fontSize:11, color:'#999', fontWeight:700, textTransform:'uppercase' }}>Dias no Período</div>
          <div style={{ fontSize:24, fontWeight:900, color:'#5c6bc0', marginTop:6 }}>{diasNoPeriodo}</div>
        </Card>
      </div>

      {/* Lista detalhada */}
      {!loading && (
        <Card style={{ padding:0 }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid #f0f0f0', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
            <h3 style={{ margin:0, fontSize:15, fontWeight:800, color:BRAND.navy }}>
              {selectedDay ? `Comandas com gorjeta — ${selectedDay} de ${MONTH_LABELS[month]}` : `Comandas com gorjeta — ${MONTH_LABELS[month]}`}
            </h3>
            {selectedDay && <Btn small variant="ghost" onClick={() => setSelectedDay(null)}>Ver mês inteiro</Btn>}
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <TableHead cols={['#','Mesa','Data','Subtotal','Gorjeta','Total Pago']} />
            <tbody>
              {dayList.length === 0 && (
                <tr><td colSpan={6} style={{ padding:'40px', textAlign:'center', color:'#ccc' }}>
                  Nenhuma gorjeta registrada {selectedDay ? 'neste dia' : 'neste mês'}
                </td></tr>
              )}
              {dayList.map(c => {
                const sub  = getSubtotal(c);
                const v    = parseFloat(c.surchargeValue) || 0;
                const gorj = c.surchargeType === 'percent' ? sub * v / 100 : v;
                return (
                  <tr key={c.id} style={{ borderBottom:'1px solid #f0f0f0' }}>
                    <td style={{ padding:'10px 16px', fontWeight:700, color:BRAND.orange }}>#{c.number}</td>
                    <td style={{ padding:'10px 16px', fontWeight:600, color:BRAND.navy }}>{c.table?.label??'—'}</td>
                    <td style={{ padding:'10px 16px', color:'#888' }}>{new Date(c.openedAt).getDate()}/{month+1}</td>
                    <td style={{ padding:'10px 16px' }}>{fmtBRL(sub)}</td>
                    <td style={{ padding:'10px 16px', fontWeight:700, color:BRAND.green }}>
                      {fmtBRL(gorj)}
                      {c.surchargeType === 'percent' &&
                        <span style={{ fontSize:11, color:'#bbb', marginLeft:4 }}>({v}%)</span>}
                    </td>
                    <td style={{ padding:'10px 16px', fontWeight:800 }}>{fmtBRL(getTotal(c))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
