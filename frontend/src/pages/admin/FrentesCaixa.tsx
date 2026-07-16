import { useState, useEffect, useCallback } from 'react';
import { cashApi } from '@/services/api';
import { BRAND, fmtBRL, fmtDate, Card, PageHeader, Btn, TableHead } from './shared';

export default function FrentesCaixa() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [from, setFrom]         = useState('');
  const [to, setTo]             = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSessions(await cashApi.list({ from: from || undefined, to: to || undefined }) as unknown as any[]);
    } catch(e) {}
    finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  const open   = sessions.filter((s:any) => s.status === 'OPEN');
  const closed = sessions.filter((s:any) => s.status === 'CLOSED');

  return (
    <div>
      <PageHeader title="Frentes de Caixa" subtitle="Histórico de abertura e fechamento de caixa" />

      <Card style={{ marginBottom:24 }}>
        <div style={{ display:'flex', gap:16, alignItems:'flex-end', flexWrap:'wrap' }}>
          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#666', marginBottom:5 }}>De</label>
            <input type="date" value={from} onChange={e=>setFrom(e.target.value)}
              style={{ border:'1.5px solid #dde', borderRadius:8, padding:'8px 12px', fontSize:14, outline:'none', fontFamily:'inherit' }} />
          </div>
          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#666', marginBottom:5 }}>Até</label>
            <input type="date" value={to} onChange={e=>setTo(e.target.value)}
              style={{ border:'1.5px solid #dde', borderRadius:8, padding:'8px 12px', fontSize:14, outline:'none', fontFamily:'inherit' }} />
          </div>
          {(from || to) && (
            <Btn variant="ghost" small onClick={() => { setFrom(''); setTo(''); }}>Limpar filtro</Btn>
          )}
        </div>
      </Card>

      {loading ? <p style={{ color:'#aaa', fontSize:13 }}>Carregando...</p> : (
        <>
          <div style={{ marginBottom:12, display:'flex', alignItems:'center', gap:10 }}>
            <h3 style={{ margin:0, fontSize:15, fontWeight:800, color:BRAND.navy }}>Caixas Abertos</h3>
            <span style={{ background:'#FFD60A22', color:'#9a7200', borderRadius:999, padding:'2px 10px', fontSize:12, fontWeight:700 }}>{open.length}</span>
          </div>
          <Card style={{ padding:0, overflow:'hidden', marginBottom:28 }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <TableHead cols={['Abertura','Valor Inicial','Observações','Tempo Aberto']} />
              <tbody>
                {open.length === 0 && (
                  <tr><td colSpan={4} style={{ padding:'32px', textAlign:'center', color:'#ccc' }}>Nenhum caixa aberto no período</td></tr>
                )}
                {open.map((s:any) => {
                  const elapsedMin = Math.floor((Date.now() - new Date(s.openedAt).getTime()) / 60000);
                  const elapsedStr = elapsedMin < 60 ? `${elapsedMin} min` : `${Math.floor(elapsedMin/60)}h${String(elapsedMin%60).padStart(2,'0')}`;
                  return (
                    <tr key={s.id} style={{ borderBottom:'1px solid #f5f5f5' }}>
                      <td style={{ padding:'12px 16px', fontWeight:700, color:BRAND.navy }}>{fmtDate(s.openedAt)}</td>
                      <td style={{ padding:'12px 16px', fontWeight:700, color:BRAND.green }}>{fmtBRL(s.openingAmount)}</td>
                      <td style={{ padding:'12px 16px', color:'#888' }}>{s.openingNotes || '—'}</td>
                      <td style={{ padding:'12px 16px', fontWeight:700, color:BRAND.orange }}>{elapsedStr}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          <div style={{ marginBottom:12, display:'flex', alignItems:'center', gap:10 }}>
            <h3 style={{ margin:0, fontSize:15, fontWeight:800, color:BRAND.navy }}>Caixas Fechados</h3>
            <span style={{ background:'#f0f2f5', color:'#555', borderRadius:999, padding:'2px 10px', fontSize:12, fontWeight:700 }}>{closed.length}</span>
          </div>
          <Card style={{ padding:0, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <TableHead cols={['Abertura','Fechamento','Valor Inicial','Esperado','Diferença','Status']} />
              <tbody>
                {closed.length === 0 && (
                  <tr><td colSpan={6} style={{ padding:'32px', textAlign:'center', color:'#ccc' }}>Nenhum caixa fechado no período</td></tr>
                )}
                {closed.map((s:any) => {
                  const div = s.divergence;
                  const totalEsperado = (div?.methods ?? []).reduce((sum:number,m:any) => sum + m.esperado, 0);
                  const hasDivergence = !!div?.hasDivergence;
                  return (
                    <tr key={s.id} style={{ borderBottom:'1px solid #f5f5f5' }}>
                      <td style={{ padding:'12px 16px', color:'#888' }}>{fmtDate(s.openedAt)}</td>
                      <td style={{ padding:'12px 16px', color:'#888' }}>{s.closedAt ? fmtDate(s.closedAt) : '—'}</td>
                      <td style={{ padding:'12px 16px', fontWeight:600 }}>{fmtBRL(s.openingAmount)}</td>
                      <td style={{ padding:'12px 16px', fontWeight:600 }}>{fmtBRL(totalEsperado)}</td>
                      <td style={{ padding:'12px 16px', fontWeight:800, color: hasDivergence ? BRAND.red : BRAND.green }}>
                        {(div?.total ?? 0) > 0 ? '+' : ''}{fmtBRL(div?.total ?? 0)}
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        <span style={{ fontSize:11, fontWeight:700,
                          color: hasDivergence ? BRAND.red : BRAND.green,
                          background: hasDivergence ? '#FCE8EA' : '#e8f8ee',
                          borderRadius:4, padding:'3px 10px' }}>
                          {hasDivergence ? '⚠ Divergência' : '✓ Conferido'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
