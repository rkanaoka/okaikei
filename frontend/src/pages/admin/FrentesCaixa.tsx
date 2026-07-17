import { useState, useEffect, useCallback } from 'react';
import { cashApi } from '@/services/api';
import { BRAND, fmtBRL, fmtDate, PAY_LABELS, Card, PageHeader, Btn, TableHead } from './shared';

export default function FrentesCaixa() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [from, setFrom]         = useState('');
  const [to, setTo]             = useState('');
  const [selected, setSelected] = useState<any>(null);

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
                    <tr key={s.id} onClick={() => setSelected(s)} style={{ borderBottom:'1px solid #f5f5f5', cursor:'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fafbfc')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
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

      {selected && (() => {
        const div = selected.divergence;
        const methods = div?.methods ?? [];
        const totalEmCaixa = methods.reduce((s:number,m:any) => s + m.emCaixa, 0);
        const totalEsperado = methods.reduce((s:number,m:any) => s + m.esperado, 0);
        const hasDivergence = !!div?.hasDivergence;
        return (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:200,
            display:'flex', alignItems:'center', justifyContent:'center' }}
            onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
            <div style={{ background:'#fff', borderRadius:16, padding:32, width:560, maxWidth:'92vw',
              boxShadow:'0 20px 60px rgba(0,0,0,.25)', maxHeight:'90vh', overflowY:'auto' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
                <div>
                  <h2 style={{ margin:0, fontSize:18, fontWeight:900, color:BRAND.navy }}>Detalhes do Caixa</h2>
                  <p style={{ margin:'4px 0 0', fontSize:13, color:'#888' }}>
                    {fmtDate(selected.openedAt)} — {selected.closedAt ? fmtDate(selected.closedAt) : '—'}
                  </p>
                </div>
                <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:BRAND.navy }}>✕</button>
              </div>

              <div style={{ display:'flex', gap:16, marginBottom:20, flexWrap:'wrap' }}>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:'#888', textTransform:'uppercase', letterSpacing:.5 }}>Valor inicial</div>
                  <div style={{ fontWeight:700, color:BRAND.navy, fontSize:14 }}>{fmtBRL(selected.openingAmount)}</div>
                </div>
                {selected.openingNotes && (
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:'#888', textTransform:'uppercase', letterSpacing:.5 }}>Obs. abertura</div>
                    <div style={{ color:'#555', fontSize:13 }}>{selected.openingNotes}</div>
                  </div>
                )}
                {selected.closingNotes && (
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:'#888', textTransform:'uppercase', letterSpacing:.5 }}>Obs. fechamento</div>
                    <div style={{ color:'#555', fontSize:13 }}>{selected.closingNotes}</div>
                  </div>
                )}
              </div>

              <div style={{ fontSize:12, fontWeight:700, color:'#888', textTransform:'uppercase', letterSpacing:.5, marginBottom:10 }}>
                Formas de pagamento
              </div>
              <div style={{ border:'1px solid #eee', borderRadius:10, overflow:'hidden', marginBottom:16 }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                  <TableHead cols={['Forma', 'Contabilizado', 'Recebido', 'Diferença']} />
                  <tbody>
                    {methods.length === 0 && (
                      <tr><td colSpan={4} style={{ padding:'20px', textAlign:'center', color:'#ccc' }}>Sem movimentações</td></tr>
                    )}
                    {methods.map((m:any) => {
                      const mDiv = Math.abs(m.diff) > 0.01;
                      return (
                        <tr key={m.method} style={{ borderTop:'1px solid #f5f5f5' }}>
                          <td style={{ padding:'10px 16px', fontWeight:700, color:BRAND.navy }}>{PAY_LABELS[m.method] ?? m.method}</td>
                          <td style={{ padding:'10px 16px' }}>{fmtBRL(m.esperado)}</td>
                          <td style={{ padding:'10px 16px' }}>{fmtBRL(m.emCaixa)}</td>
                          <td style={{ padding:'10px 16px', fontWeight:700, color: mDiv ? (m.diff < 0 ? BRAND.red : BRAND.green) : '#999' }}>
                            {m.diff > 0 ? '+' : ''}{fmtBRL(m.diff)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {methods.length > 0 && (
                    <tfoot>
                      <tr style={{ borderTop:`2px solid ${BRAND.navy}`, background:'#fafbfc' }}>
                        <td style={{ padding:'10px 16px', fontWeight:900, color:BRAND.navy }}>Total</td>
                        <td style={{ padding:'10px 16px', fontWeight:900 }}>{fmtBRL(totalEsperado)}</td>
                        <td style={{ padding:'10px 16px', fontWeight:900 }}>{fmtBRL(totalEmCaixa)}</td>
                        <td style={{ padding:'10px 16px', fontWeight:900, color: hasDivergence ? BRAND.red : BRAND.green }}>
                          {(div?.total ?? 0) > 0 ? '+' : ''}{fmtBRL(div?.total ?? 0)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'10px', borderRadius:8,
                background: hasDivergence ? '#FCE8EA' : '#e8f8ee', color: hasDivergence ? BRAND.red : BRAND.green,
                fontWeight:700, fontSize:13, marginBottom:20 }}>
                {hasDivergence ? '⚠ Divergência encontrada no fechamento' : '✓ Caixa conferido sem divergências'}
              </div>

              <div style={{ display:'flex', justifyContent:'flex-end' }}>
                <Btn variant="ghost" onClick={() => setSelected(null)}>Fechar</Btn>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
