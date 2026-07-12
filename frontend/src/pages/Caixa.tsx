import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { comandasApi } from '@/services/api';

const BRAND = { navy:'#0D1B2A', yellow:'#FFD60A', orange:'#FF6B2B', red:'#E63946', green:'#2DC653', navyLight:'#1A2E44', cream:'#FFF8F0' };
const fmtBRL = (v:any) => `R$ ${parseFloat(v||0).toFixed(2).replace('.',',')}`;

type PayMethod = 'CASH'|'CARD'|'PIX'|'VOUCHER';
type Payment   = { method: PayMethod; amount: string };

const PAY_LABELS: Record<PayMethod,string> = { CASH:'💵 Dinheiro', CARD:'💳 Cartão', PIX:'🟢 Pix', VOUCHER:'🎟️ Voucher' };

function PillBtn({ children, onClick, variant='primary', disabled=false, small=false }:any) {
  const styles: Record<string,any> = {
    primary:   { background:`linear-gradient(135deg,${BRAND.orange},${BRAND.red})`, color:'#fff' },
    secondary: { background:BRAND.yellow, color:BRAND.navy },
    ghost:     { background:'transparent', border:`2px solid ${BRAND.navy}`, color:BRAND.navy },
    danger:    { background:BRAND.red, color:'#fff' },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...styles[variant], display:'inline-flex', alignItems:'center', justifyContent:'center',
      border:'none', borderRadius:'999px', cursor:'pointer', fontWeight:800, fontFamily:'inherit',
      padding: small ? '8px 18px' : '14px 28px', fontSize: small ? 13 : 16,
      opacity: disabled ? .45 : 1, transition:'transform .1s',
    }}>
      {children}
    </button>
  );
}

function GratuityControl({ surcharge, onChange }: { surcharge: { type:'percent'|'fixed'|''; value:string }; onChange:(s:{type:'percent'|'fixed'|'';value:string})=>void }) {
  const active = !!surcharge.type && parseFloat(surcharge.value) > 0;
  const [editing, setEditing] = useState(false);

  function toggle() {
    if (active) { onChange({ type:'', value:'' }); setEditing(false); }
    else        { onChange({ type:'percent', value:'10' }); }
  }

  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'#666', cursor:'pointer' }}>
          <input type="checkbox" checked={active} onChange={toggle} style={{ width:16, height:16, accentColor:BRAND.orange, cursor:'pointer' }} />
          <span>
            Gorjeta compulsória
            {active && (
              <span style={{ color:BRAND.orange, fontWeight:700 }}>
                {' '}({surcharge.type === 'percent' ? `${surcharge.value}%` : fmtBRL(surcharge.value)})
              </span>
            )}
          </span>
        </label>
        {active && (
          <button onClick={()=>setEditing(e=>!e)} style={{ background:'none', border:'none', color:BRAND.navy, fontWeight:700, fontSize:12, textDecoration:'underline', cursor:'pointer' }}>
            {editing ? 'ok' : 'editar'}
          </button>
        )}
      </div>
      {active && editing && (
        <div style={{ display:'flex', gap:8, marginTop:8 }}>
          <select value={surcharge.type} onChange={e=>onChange({ type:e.target.value as 'percent'|'fixed', value:surcharge.value })}
            style={{ border:`1.5px solid ${BRAND.navy}`, borderRadius:8, padding:'5px 8px', fontSize:13, fontWeight:700, outline:'none' }}>
            <option value="percent">%</option>
            <option value="fixed">R$ fixo</option>
          </select>
          <input type="number" min="0" step="0.01" value={surcharge.value}
            onChange={e=>onChange({ type:surcharge.type, value:e.target.value })}
            style={{ width:90, textAlign:'right', border:`1.5px solid ${BRAND.navy}`, borderRadius:8, padding:'5px 10px', fontSize:14, fontWeight:700, outline:'none' }} />
        </div>
      )}
    </div>
  );
}

const STATUS_CFG: Record<string,{label:string;color:string;bg:string}> = {
  OPEN:      { label:'Aberta',    color:BRAND.orange, bg:'#FF6B2B18' },
  PREPARING: { label:'Em Preparo',color:'#b38600',   bg:'#FFD60A22' },
  CLOSED:    { label:'Fechada',   color:BRAND.green,  bg:'#2DC65318' },
  CANCELLED: { label:'Cancelada', color:BRAND.red,    bg:'#E6394618' },
};

const ITEM_STATUS_CFG: Record<string,{label:string;color:string}> = {
  PENDING:   { label:'Pendente',  color:'#aaa' },
  SENT:      { label:'Enviado',   color:BRAND.orange },
  PREPARING: { label:'Preparo',   color:'#b38600' },
  READY:     { label:'Pronto',    color:BRAND.green },
  DELIVERED: { label:'Entregue',  color:'#555' },
  CANCELLED: { label:'Cancelado', color:BRAND.red },
};

export default function Caixa() {
  const { id }     = useParams<{ id: string }>();
  const navigate   = useNavigate();

  const [comanda, setComanda] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const [discount,  setDiscount]  = useState('0');
  // Gorjeta compulsória de 10% aplicada por padrão; caixa pode remover ou editar (% ou R$)
  const [surcharge, setSurcharge] = useState<{ type: 'percent'|'fixed'|''; value: string }>({ type:'percent', value:'10' });
  const [payments,  setPayments]  = useState<Payment[]>([{ method:'CASH', amount:'' }]);

  const [paying, setPaying]     = useState(false);
  const [payError, setPayError] = useState('');
  const [showPay,  setShowPay]  = useState(false);

  const initedSurcharge = useRef(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const c: any = await comandasApi.get(id);
      setComanda(c);
      // Só inicializa/reseta a gorjeta na primeira carga — refresh manual não deve apagar edição do caixa
      if (!initedSurcharge.current) {
        setSurcharge({
          type:  c.surchargeType || 'percent',
          value: c.surchargeType ? String(c.surchargeValue ?? '') : '10',
        });
        initedSurcharge.current = true;
      }
    } catch(e:any) { setError(e.message); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const subtotal   = (comanda?.items ?? []).reduce((s:number,i:any) => s + i.quantity * parseFloat(i.unitPrice), 0);
  const discVal    = Math.min(subtotal, parseFloat(discount)||0);
  const surchVal   = surcharge.type && parseFloat(surcharge.value) > 0
    ? (surcharge.type === 'percent' ? subtotal * parseFloat(surcharge.value) / 100 : parseFloat(surcharge.value))
    : 0;
  const total      = Math.max(0, subtotal - discVal + surchVal);
  const paidTotal  = payments.reduce((s,p) => s + (parseFloat(p.amount)||0), 0);
  const remaining  = Math.max(0, total - paidTotal);
  const change     = Math.max(0, paidTotal - total);

  function addPayment() { setPayments(p => [...p, { method:'CASH', amount:'' }]); }
  function removePayment(idx:number) { setPayments(p => p.filter((_,i)=>i!==idx)); }
  function updatePayment(idx:number, field:'method'|'amount', val:string) {
    setPayments(p => { const n=[...p]; n[idx]={...n[idx],[field]:val}; return n; });
  }
  function splitEqually() {
    const n = payments.length;
    const each = (total/n).toFixed(2);
    setPayments(p => p.map(x => ({ ...x, amount:each })));
  }
  function fillRemaining(idx:number) {
    const othersPaid = payments.reduce((s,p,i) => i===idx?s:s+(parseFloat(p.amount)||0), 0);
    const amt = Math.max(0, total - othersPaid).toFixed(2);
    updatePayment(idx, 'amount', amt);
  }

  async function pay() {
    if (remaining > 0.01) { setPayError('Valor recebido insuficiente.'); return; }
    const validPays = payments.filter(p => parseFloat(p.amount) > 0);
    if (!validPays.length) { setPayError('Adicione ao menos um pagamento.'); return; }
    setPaying(true); setPayError('');
    try {
      await comandasApi.pay(id!, {
        payments: validPays.map(p => ({ method: p.method, amount: parseFloat(p.amount) })),
        discountType:   discVal > 0 ? 'fixed' : undefined,
        discountValue:  discVal || undefined,
        surchargeType:  surcharge.type || undefined,
        surchargeValue: surcharge.type ? (parseFloat(surcharge.value) || 0) : undefined,
      });
      await load();
      setShowPay(false);
    } catch(e:any) { setPayError(e.message); }
    finally { setPaying(false); }
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', background:BRAND.navy, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:40,height:40,borderRadius:'50%',border:`4px solid #fff3`,borderTopColor:BRAND.orange,animation:'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div style={{ minHeight:'100vh', background:BRAND.navy, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16 }}>
      <div style={{ fontSize:40 }}>⚠️</div>
      <div style={{ color:'#fff', fontWeight:700 }}>{error}</div>
      <PillBtn variant="secondary" onClick={()=>navigate('/')}>Voltar</PillBtn>
    </div>
  );

  const statusCfg = STATUS_CFG[comanda?.status] ?? STATUS_CFG.OPEN;

  return (
    <div style={{ minHeight:'100vh', background:'#f4f1ec', fontFamily:'Poppins,sans-serif' }}>
      {/* Header */}
      <div style={{ background:BRAND.navy, padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:`3px solid ${BRAND.yellow}`, position:'sticky', top:0, zIndex:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={()=>navigate('/')} style={{ background:'none',border:'none',color:BRAND.yellow,fontSize:22,cursor:'pointer',padding:0 }}>←</button>
          <div>
            <div style={{ fontSize:20, fontWeight:900, color:BRAND.yellow }}>{comanda?.table?.label ?? 'Sem mesa'}</div>
            {comanda?.customerName && <div style={{ fontSize:12, color:'#fff8' }}>{comanda.customerName}</div>}
          </div>
          <span style={{ fontSize:11, fontWeight:700, padding:'3px 12px', borderRadius:'999px', background:statusCfg.bg, color:statusCfg.color }}>{statusCfg.label}</span>
        </div>
        <button onClick={load} style={{ background:'none',border:'none',color:'#fff8',fontSize:20,cursor:'pointer' }}>⟳</button>
      </div>

      <div style={{ maxWidth:640, margin:'0 auto', padding:'20px 16px' }}>
        {/* Items */}
        <div style={{ background:'#fff', borderRadius:16, border:`2px solid ${BRAND.navy}`, boxShadow:`4px 4px 0 ${BRAND.navy}15`, overflow:'hidden', marginBottom:16 }}>
          <div style={{ padding:'16px 20px', borderBottom:`1px solid #e8e2dc`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontWeight:900, color:BRAND.navy, fontSize:16 }}>📋 Itens ({comanda?.items?.length ?? 0})</div>
            {comanda?.status !== 'CLOSED' && <PillBtn small variant="secondary" onClick={()=>navigate('/garcom')}>+ Adicionar</PillBtn>}
          </div>
          {(comanda?.items ?? []).length === 0 ? (
            <div style={{ padding:'32px 20px', textAlign:'center', color:'#aaa', fontWeight:600 }}>Nenhum item ainda</div>
          ) : (comanda.items).map((item:any) => {
            const ic = ITEM_STATUS_CFG[item.status] ?? ITEM_STATUS_CFG.PENDING;
            return (
              <div key={item.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 20px', borderBottom:`1px solid #f0ebe5` }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, color:BRAND.navy, fontSize:14 }}>{item.menuItem?.name ?? 'Item'}</div>
                  {item.notes && <div style={{ fontSize:12, color:BRAND.orange, marginTop:2 }}>📝 {item.notes}</div>}
                  <div style={{ fontSize:11, color:ic.color, fontWeight:700, marginTop:2, textTransform:'uppercase', letterSpacing:.5 }}>{ic.label}</div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0, marginLeft:12 }}>
                  <div style={{ fontSize:12, color:'#999' }}>{item.quantity}x {fmtBRL(item.unitPrice)}</div>
                  <div style={{ fontWeight:900, color:BRAND.navy, fontSize:15 }}>{fmtBRL(item.quantity * parseFloat(item.unitPrice))}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Totals */}
        <div style={{ background:'#fff', borderRadius:16, border:`2px solid ${BRAND.navy}`, boxShadow:`4px 4px 0 ${BRAND.navy}15`, padding:'20px', marginBottom:16 }}>
          <div style={{ fontWeight:900, color:BRAND.navy, fontSize:15, marginBottom:14 }}>💰 Conta</div>

          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
            <span style={{ color:'#666' }}>Subtotal</span>
            <span style={{ fontWeight:700, color:BRAND.navy }}>{fmtBRL(subtotal)}</span>
          </div>

          {comanda?.status !== 'CLOSED' && (
            <>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <span style={{ color:'#666', fontSize:13 }}>Desconto (R$)</span>
                <input type="number" min="0" step="0.01" value={discount}
                  onChange={e=>setDiscount(e.target.value)}
                  style={{ width:90, textAlign:'right', border:`1.5px solid ${BRAND.navy}`, borderRadius:8, padding:'5px 10px', fontSize:14, fontWeight:700, outline:'none' }} />
              </div>
              <GratuityControl surcharge={surcharge} onChange={setSurcharge} />
            </>
          )}

          <div style={{ display:'flex', justifyContent:'space-between', paddingTop:12, borderTop:`2px solid ${BRAND.navy}` }}>
            <span style={{ fontWeight:900, fontSize:18, color:BRAND.navy }}>Total</span>
            <span style={{ fontWeight:900, fontSize:22, color:comanda?.status==='CLOSED'?BRAND.green:BRAND.navy }}>{fmtBRL(comanda?.status==='CLOSED'? comanda.total : total)}</span>
          </div>

          {comanda?.status === 'CLOSED' && (comanda?.payments ?? []).length > 0 && (
            <div style={{ marginTop:14, paddingTop:12, borderTop:`1px solid #e8e2dc` }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#888', marginBottom:8, textTransform:'uppercase', letterSpacing:.5 }}>Pagamentos</div>
              {comanda.payments.map((p:any,i:number) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:14, marginBottom:4 }}>
                  <span style={{ color:'#555' }}>{PAY_LABELS[p.method as PayMethod] ?? p.method}</span>
                  <span style={{ fontWeight:700, color:BRAND.navy }}>{fmtBRL(p.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        {comanda?.status !== 'CLOSED' && comanda?.status !== 'CANCELLED' && (
          <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
            <PillBtn onClick={()=>setShowPay(true)}>Fechar Conta</PillBtn>
          </div>
        )}
      </div>

      {/* Payment sheet */}
      {showPay && (
        <div style={{ position:'fixed', inset:0, background:'rgba(13,27,42,.8)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:100 }} onClick={e=>{if(e.target===e.currentTarget)setShowPay(false);}}>
          <div style={{ background:BRAND.cream, borderRadius:'24px 24px 0 0', borderTop:`3px solid ${BRAND.navy}`, padding:'24px 20px 40px', width:'100%', maxWidth:480, maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <div style={{ fontWeight:900, fontSize:20, color:BRAND.navy }}>Fechar Conta</div>
              <button onClick={()=>setShowPay(false)} style={{ background:'none',border:'none',fontSize:24,cursor:'pointer',color:BRAND.navy }}>✕</button>
            </div>

            {/* Summary chip */}
            <div style={{ background:`${BRAND.navy}0d`, borderRadius:14, padding:'16px', marginBottom:20 }}>
              {discVal>0 && <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'#666', marginBottom:4 }}><span>Desconto</span><span style={{ color:BRAND.green }}>−{fmtBRL(discVal)}</span></div>}
              {surchVal>0 && <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'#666', marginBottom:4 }}><span>Gorjeta {surcharge.type==='percent' ? `(${surcharge.value}%)` : ''}</span><span style={{ color:BRAND.orange }}>+{fmtBRL(surchVal)}</span></div>}
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontWeight:900, fontSize:17, color:BRAND.navy }}>Total a pagar</span>
                <span style={{ fontWeight:900, fontSize:20, color:BRAND.navy }}>{fmtBRL(total)}</span>
              </div>
            </div>

            {/* Payment rows */}
            {payments.map((p,idx) => (
              <div key={idx} style={{ display:'flex', gap:10, alignItems:'center', marginBottom:12 }}>
                <select value={p.method} onChange={e=>updatePayment(idx,'method',e.target.value)}
                  style={{ flex:1, border:`2px solid ${BRAND.navy}`, borderRadius:10, padding:'10px 12px', fontWeight:700, fontSize:14, background:'#fff', outline:'none', cursor:'pointer' }}>
                  {(Object.keys(PAY_LABELS) as PayMethod[]).map(m => <option key={m} value={m}>{PAY_LABELS[m]}</option>)}
                </select>
                <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                  <input type="number" min="0" step="0.01" value={p.amount}
                    onChange={e=>updatePayment(idx,'amount',e.target.value)}
                    placeholder="0,00"
                    style={{ width:90, border:`2px solid ${BRAND.navy}`, borderRadius:10, padding:'10px 12px', fontWeight:700, fontSize:14, textAlign:'right', outline:'none' }} />
                  <button onClick={()=>fillRemaining(idx)} title="Completar restante"
                    style={{ background:`${BRAND.navy}15`, border:'none', borderRadius:8, padding:'8px 10px', cursor:'pointer', fontWeight:700, fontSize:13, color:BRAND.navy }}>
                    ↓
                  </button>
                </div>
                {payments.length > 1 && (
                  <button onClick={()=>removePayment(idx)} style={{ background:'none',border:'none',color:BRAND.red,fontSize:18,cursor:'pointer' }}>✕</button>
                )}
              </div>
            ))}

            <div style={{ display:'flex', gap:10, marginBottom:20 }}>
              <button onClick={addPayment} style={{ flex:1, background:'#fff', border:`2px dashed ${BRAND.navy}`, borderRadius:10, padding:'10px', cursor:'pointer', fontWeight:700, color:BRAND.navy, fontSize:13 }}>
                + Forma de pagamento
              </button>
              {payments.length > 1 && (
                <button onClick={splitEqually} style={{ background:`${BRAND.navy}15`, border:'none', borderRadius:10, padding:'10px 14px', cursor:'pointer', fontWeight:700, color:BRAND.navy, fontSize:13 }}>
                  Dividir
                </button>
              )}
            </div>

            {/* Remaining / change */}
            {paidTotal > 0 && (
              <div style={{ background:'#fff', borderRadius:12, padding:'14px', marginBottom:16, border:`1.5px solid ${remaining>0.01?BRAND.orange:BRAND.green}` }}>
                {remaining > 0.01 ? (
                  <div style={{ display:'flex', justifyContent:'space-between', fontWeight:700, color:BRAND.orange }}>
                    <span>Falta</span><span>{fmtBRL(remaining)}</span>
                  </div>
                ) : (
                  <div style={{ display:'flex', justifyContent:'space-between', fontWeight:700, color:BRAND.green }}>
                    <span>Troco</span><span>{fmtBRL(change)}</span>
                  </div>
                )}
              </div>
            )}

            {payError && <p style={{ color:BRAND.red, fontWeight:700, fontSize:13, marginBottom:12 }}>{payError}</p>}

            <PillBtn onClick={pay} disabled={paying || remaining > 0.01}>
              {paying ? 'Fechando…' : '✓ Confirmar Pagamento'}
            </PillBtn>
          </div>
        </div>
      )}
    </div>
  );
}
