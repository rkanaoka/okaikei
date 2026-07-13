import { useState, useEffect, useCallback, Fragment, type CSSProperties } from 'react';
import { cashApi } from '@/services/api';

const BRAND = { navy:'#0D1B2A', yellow:'#FFD60A', orange:'#FF6B2B', red:'#E63946', green:'#2DC653' };
const fmtBRL = (v:any) => `R$ ${parseFloat(v||0).toFixed(2).replace('.',',')}`;
const METHOD_LABEL: Record<string,string> = { CASH:'Dinheiro', CARD:'Cartão', PIX:'Pix', VOUCHER:'Voucher' };

function fmtElapsed(min: number) {
  if (min < 60) return `${min}min`;
  return `${Math.floor(min/60)}h${String(min%60).padStart(2,'0')}min`;
}

const navBtnStyle: CSSProperties = {
  display:'inline-flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:999,
  border:'2px solid #fff3', background:'transparent', color:'#fff', fontWeight:700, fontSize:13,
  cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap',
};
const dropdownStyle: CSSProperties = {
  position:'absolute', top:'calc(100% + 8px)', right:0, background:'#fff', borderRadius:12,
  boxShadow:'0 8px 30px rgba(0,0,0,.25)', minWidth:280, zIndex:200, overflow:'hidden',
};
const menuItemStyle: CSSProperties = {
  display:'block', width:'100%', textAlign:'left', padding:'12px 16px', background:'none', border:'none',
  cursor:'pointer', fontSize:14, fontWeight:600, color:BRAND.navy, fontFamily:'inherit', borderBottom:'1px solid #f5f5f5',
};
const fieldWrap: CSSProperties = { marginBottom:16 };
const labelStyle: CSSProperties = { display:'block', fontSize:12, fontWeight:700, color:'#666', textTransform:'uppercase', letterSpacing:.5, marginBottom:6 };
const inputStyle: CSSProperties = { width:'100%', boxSizing:'border-box', border:`2px solid ${BRAND.navy}`, borderRadius:10, padding:'10px 12px', fontSize:14, fontFamily:'inherit', outline:'none' };
const errStyle: CSSProperties = { color:BRAND.red, fontSize:13, fontWeight:700, marginBottom:12 };
const primaryBtnStyle: CSSProperties = { width:'100%', background:`linear-gradient(135deg,${BRAND.orange},${BRAND.red})`, color:'#fff', border:'none', borderRadius:999, padding:'12px 20px', fontWeight:800, fontSize:14, cursor:'pointer' };
const ghostBtnStyle: CSSProperties = { background:'transparent', border:`2px solid ${BRAND.navy}`, color:BRAND.navy, borderRadius:999, padding:'12px 20px', fontWeight:800, fontSize:14, cursor:'pointer' };

function Modal({ title, onClose, children, width=420 }:any) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(13,27,42,.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300, padding:16 }}
      onClick={e=>{ if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:width, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 12px 40px rgba(0,0,0,.4)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px', borderBottom:'1px solid #eee' }}>
          <div style={{ fontWeight:900, fontSize:16, color:BRAND.navy }}>{title}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:BRAND.navy }}>✕</button>
        </div>
        <div style={{ padding:20 }}>{children}</div>
      </div>
    </div>
  );
}

function MethodBreakdown({ m }: { m:any }) {
  if (m.method !== 'CASH') return null;
  return (
    <div style={{ fontSize:11, color:'#999', lineHeight:1.7 }}>
      <div>Abertura de caixa(+) {fmtBRL(m.opening)}</div>
      <div>Vendas(+) {fmtBRL(m.sales)}</div>
      <div>Retiradas(-) {fmtBRL(m.withdrawals)}</div>
      <div>Reforços(+) {fmtBRL(m.reinforcements)}</div>
    </div>
  );
}

function SummaryTable({ methods }: { methods:any[] }) {
  const total = methods.reduce((s:number,m:any) => s + m.esperado, 0);
  return (
    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
      <thead>
        <tr style={{ textAlign:'left', color:'#888', fontSize:11, textTransform:'uppercase' }}>
          <th style={{ padding:'6px 4px' }}>Forma Pgto.</th>
          <th style={{ padding:'6px 4px', textAlign:'right' }}>Esperado</th>
        </tr>
      </thead>
      <tbody>
        {methods.map((m:any) => (
          <Fragment key={m.method}>
            <tr style={{ borderTop:'1px solid #eee' }}>
              <td style={{ padding:'8px 4px', fontWeight:700, color:BRAND.navy }}>{METHOD_LABEL[m.method] ?? m.method}</td>
              <td style={{ padding:'8px 4px', textAlign:'right', fontWeight:700 }}>{fmtBRL(m.esperado)}</td>
            </tr>
            {m.method === 'CASH' && (
              <tr>
                <td colSpan={2} style={{ padding:'0 4px 8px 16px' }}><MethodBreakdown m={m} /></td>
              </tr>
            )}
          </Fragment>
        ))}
        <tr style={{ borderTop:`2px solid ${BRAND.navy}` }}>
          <td style={{ padding:'8px 4px', fontWeight:900 }}>TOTAL</td>
          <td style={{ padding:'8px 4px', textAlign:'right', fontWeight:900 }}>{fmtBRL(total)}</td>
        </tr>
      </tbody>
    </table>
  );
}

function CloseTable({ methods, counts, onChange }: { methods:any[]; counts:Record<string,string>; onChange:(method:string, value:string)=>void }) {
  const totalEsperado = methods.reduce((s:number,m:any) => s + m.esperado, 0);
  const totalEmCaixa  = methods.reduce((s:number,m:any) => s + (parseFloat(counts[m.method]) || 0), 0);
  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, minWidth:420 }}>
        <thead>
          <tr style={{ textAlign:'left', color:'#888', fontSize:11, textTransform:'uppercase' }}>
            <th style={{ padding:'6px 4px' }}>Forma Pgto.</th>
            <th style={{ padding:'6px 4px', textAlign:'right' }}>Esperado</th>
            <th style={{ padding:'6px 4px', textAlign:'right' }}>Em Caixa</th>
            <th style={{ padding:'6px 4px', textAlign:'right' }}>Saldo</th>
          </tr>
        </thead>
        <tbody>
          {methods.map((m:any) => {
            const emCaixa = parseFloat(counts[m.method]) || 0;
            const saldo   = emCaixa - m.esperado;
            return (
              <Fragment key={m.method}>
                <tr style={{ borderTop:'1px solid #eee' }}>
                  <td style={{ padding:'8px 4px', fontWeight:700, color:BRAND.navy }}>{METHOD_LABEL[m.method] ?? m.method}</td>
                  <td style={{ padding:'8px 4px', textAlign:'right' }}>{fmtBRL(m.esperado)}</td>
                  <td style={{ padding:'8px 4px', textAlign:'right' }}>
                    <input type="number" step="0.01" value={counts[m.method] ?? '0'}
                      onChange={e=>onChange(m.method, e.target.value)}
                      style={{ width:80, textAlign:'right', border:`1.5px solid ${BRAND.navy}`, borderRadius:6, padding:'4px 6px', fontSize:13, fontWeight:700, outline:'none' }} />
                  </td>
                  <td style={{ padding:'8px 4px', textAlign:'right', fontWeight:700, color: Math.abs(saldo) < 0.01 ? BRAND.green : BRAND.red }}>{fmtBRL(saldo)}</td>
                </tr>
                {m.method === 'CASH' && (
                  <tr>
                    <td colSpan={4} style={{ padding:'0 4px 8px 16px' }}><MethodBreakdown m={m} /></td>
                  </tr>
                )}
              </Fragment>
            );
          })}
          <tr style={{ borderTop:`2px solid ${BRAND.navy}` }}>
            <td style={{ padding:'8px 4px', fontWeight:900 }}>TOTAL</td>
            <td style={{ padding:'8px 4px', textAlign:'right', fontWeight:900 }}>{fmtBRL(totalEsperado)}</td>
            <td style={{ padding:'8px 4px', textAlign:'right', fontWeight:900 }}>{fmtBRL(totalEmCaixa)}</td>
            <td style={{ padding:'8px 4px', textAlign:'right', fontWeight:900, color: Math.abs(totalEmCaixa-totalEsperado) < 0.01 ? BRAND.green : BRAND.red }}>{fmtBRL(totalEmCaixa-totalEsperado)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function CashRegisterMenu() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const [showOpen, setShowOpen]   = useState(false);
  const [openAmount, setOpenAmount] = useState('');
  const [openNotes, setOpenNotes] = useState('');
  const [opening, setOpening]     = useState(false);
  const [openError, setOpenError] = useState('');

  const [movementType, setMovementType]     = useState<'WITHDRAWAL'|'REINFORCEMENT'|null>(null);
  const [movementAmount, setMovementAmount] = useState('');
  const [movementNotes, setMovementNotes]   = useState('');
  const [savingMovement, setSavingMovement] = useState(false);
  const [movementError, setMovementError]   = useState('');

  const [showResumo, setShowResumo] = useState(false);

  const [showClose, setShowClose]         = useState(false);
  const [closingCounts, setClosingCounts] = useState<Record<string,string>>({});
  const [closingNotes, setClosingNotes]   = useState('');
  const [closing, setClosing]             = useState(false);
  const [closeError, setCloseError]       = useState('');

  const load = useCallback(async () => {
    try {
      const s = await cashApi.current();
      setSummary(s);
    } catch { /* sem caixa aberto ou erro de rede — trata como fechado */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const session = summary?.session;

  async function handleOpen() {
    setOpening(true); setOpenError('');
    try {
      await cashApi.open({ openingAmount: parseFloat(openAmount) || 0, notes: openNotes || undefined });
      setShowOpen(false); setOpenAmount(''); setOpenNotes('');
      await load();
    } catch(e:any) { setOpenError(e.message); }
    finally { setOpening(false); }
  }

  function openMovement(type: 'WITHDRAWAL'|'REINFORCEMENT') {
    setMenuOpen(false);
    setMovementType(type); setMovementAmount(''); setMovementNotes(''); setMovementError('');
  }

  async function handleMovement() {
    if (!session || !movementType) return;
    const amount = parseFloat(movementAmount);
    if (!amount || amount <= 0) { setMovementError('Informe um valor válido.'); return; }
    setSavingMovement(true); setMovementError('');
    try {
      await cashApi.addMovement(session.id, { type: movementType, amount, notes: movementNotes || undefined });
      setMovementType(null);
      await load();
    } catch(e:any) { setMovementError(e.message); }
    finally { setSavingMovement(false); }
  }

  function openCloseModal() {
    setMenuOpen(false);
    const initial: Record<string,string> = {};
    (summary?.methods ?? []).forEach((m:any) => { initial[m.method] = '0'; });
    setClosingCounts(initial);
    setClosingNotes('');
    setCloseError('');
    setShowClose(true);
  }

  async function handleClose() {
    if (!session) return;
    setClosing(true); setCloseError('');
    try {
      const counts: Record<string, number> = {};
      Object.entries(closingCounts).forEach(([k,v]) => { counts[k] = parseFloat(v) || 0; });
      await cashApi.close(session.id, { closingCounts: counts, notes: closingNotes || undefined });
      setShowClose(false);
      await load();
    } catch(e:any) { setCloseError(e.message); }
    finally { setClosing(false); }
  }

  if (loading) return null;

  // ── Sem caixa aberto ──────────────────────────────────────────────────────
  if (!session) {
    return (
      <>
        <button onClick={()=>setShowOpen(true)} style={navBtnStyle}>🧾 Abrir Caixa</button>
        {showOpen && (
          <Modal title="Abertura de Frente de Caixa" onClose={()=>setShowOpen(false)}>
            <div style={fieldWrap}>
              <label style={labelStyle}>Valor em dinheiro (R$)</label>
              <input type="number" min="0" step="0.01" value={openAmount} onChange={e=>setOpenAmount(e.target.value)} autoFocus placeholder="0,00" style={inputStyle} />
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>Observações <span style={{ fontWeight:400, textTransform:'none', opacity:.6 }}>(opcional)</span></label>
              <textarea value={openNotes} onChange={e=>setOpenNotes(e.target.value)} rows={3} style={{ ...inputStyle, resize:'none' }} />
            </div>
            {openError && <p style={errStyle}>{openError}</p>}
            <button onClick={handleOpen} disabled={opening} style={{ ...primaryBtnStyle, opacity: opening ? .6 : 1 }}>
              {opening ? 'Abrindo…' : '✓ Abrir Caixa'}
            </button>
          </Modal>
        )}
      </>
    );
  }

  // ── Caixa aberto ──────────────────────────────────────────────────────────
  const cashMethod = summary.methods.find((m:any) => m.method === 'CASH');

  return (
    <div style={{ position:'relative' }}>
      <button onClick={()=>setMenuOpen(o=>!o)} style={navBtnStyle}>
        <span style={{ width:8, height:8, borderRadius:'50%', background:BRAND.green, boxShadow:`0 0 6px ${BRAND.green}`, display:'inline-block' }} />
        🧾 CAIXA — BODOGAMI
      </button>

      {menuOpen && (
        <>
          <div style={{ position:'fixed', inset:0, zIndex:150 }} onClick={()=>setMenuOpen(false)} />
          <div style={dropdownStyle}>
            <div style={{ padding:'12px 16px', borderBottom:'1px solid #eee' }}>
              <div style={{ fontSize:13, color:'#666' }}>Aberto há {fmtElapsed(summary.elapsedMinutes)}</div>
              <div style={{ fontWeight:800, color:BRAND.navy, fontSize:14, marginTop:2 }}>
                Valor em dinheiro: {fmtBRL(cashMethod?.esperado ?? 0)}
              </div>
            </div>
            <button style={menuItemStyle} onClick={()=>openMovement('WITHDRAWAL')}>⊖ Retirada de frente de caixa</button>
            <button style={menuItemStyle} onClick={()=>openMovement('REINFORCEMENT')}>⊕ Reforço de frente de caixa</button>
            <button style={menuItemStyle} onClick={()=>{ setMenuOpen(false); setShowResumo(true); }}>▤ Resumo parcial</button>
            <button style={{ ...menuItemStyle, color:BRAND.red, borderBottom:'none' }} onClick={openCloseModal}>✕ Fechar frente de caixa</button>
          </div>
        </>
      )}

      {movementType && (
        <Modal title={movementType === 'WITHDRAWAL' ? 'Retirada de Frente de Caixa' : 'Reforço de Frente de Caixa'} onClose={()=>setMovementType(null)}>
          <div style={fieldWrap}>
            <label style={labelStyle}>Valor (R$)</label>
            <input type="number" min="0" step="0.01" value={movementAmount} onChange={e=>setMovementAmount(e.target.value)} autoFocus placeholder="0,00" style={inputStyle} />
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Observações <span style={{ fontWeight:400, textTransform:'none', opacity:.6 }}>(opcional)</span></label>
            <textarea value={movementNotes} onChange={e=>setMovementNotes(e.target.value)} rows={3} style={{ ...inputStyle, resize:'none' }} />
          </div>
          {movementError && <p style={errStyle}>{movementError}</p>}
          <button onClick={handleMovement} disabled={savingMovement} style={{ ...primaryBtnStyle, opacity: savingMovement ? .6 : 1 }}>
            {savingMovement ? 'Salvando…' : '✓ Confirmar'}
          </button>
        </Modal>
      )}

      {showResumo && (
        <Modal title="Resumo Parcial de Frente de Caixa" onClose={()=>setShowResumo(false)} width={480}>
          <SummaryTable methods={summary.methods} />
        </Modal>
      )}

      {showClose && (
        <Modal title="Fechamento de Frente de Caixa - BODOGAMI" onClose={()=>setShowClose(false)} width={520}>
          <div style={{ fontSize:12, color:'#888', marginBottom:16 }}>
            Abertura: {new Date(session.openedAt).toLocaleString('pt-BR', { timeZone:'America/Sao_Paulo' })}
          </div>
          <CloseTable methods={summary.methods} counts={closingCounts} onChange={(m,v)=>setClosingCounts(p=>({ ...p, [m]:v }))} />
          <div style={{ marginTop:16 }}>
            <label style={labelStyle}>Obs. Fechamento</label>
            <textarea value={closingNotes} onChange={e=>setClosingNotes(e.target.value)} rows={3} style={{ ...inputStyle, resize:'none' }} />
          </div>
          {closeError && <p style={errStyle}>{closeError}</p>}
          <div style={{ display:'flex', gap:12, marginTop:16, justifyContent:'flex-end' }}>
            <button onClick={()=>setShowClose(false)} style={ghostBtnStyle}>Cancelar</button>
            <button onClick={handleClose} disabled={closing} style={{ ...primaryBtnStyle, width:'auto', opacity: closing ? .6 : 1 }}>
              {closing ? 'Fechando…' : 'Fechar Frente de Caixa'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
