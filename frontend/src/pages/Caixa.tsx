import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { comandasApi, reasonsApi, menuApi, tablesApi } from '@/services/api';

const BRAND = { navy:'#0D1B2A', yellow:'#FFD60A', orange:'#FF6B2B', red:'#E63946', green:'#2DC653', navyLight:'#1A2E44', cream:'#FFF8F0' };
const fmtBRL = (v:any) => `R$ ${parseFloat(v||0).toFixed(2).replace('.',',')}`;

type PayMethod = 'CASH'|'CARD'|'PIX'|'VOUCHER';
type Payment   = { method: PayMethod; amount: string };

const PAY_LABELS: Record<PayMethod,string> = { CASH:'💵 Dinheiro', CARD:'💳 Cartão', PIX:'🟢 Pix', VOUCHER:'🎟️ Voucher' };
const CAT_LABEL: Record<string,string> = { kitchen:'🍱 Cozinha', bar:'🍺 Bar', cashier:'💰 Caixa' };

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

  const [discount,  setDiscount]  = useState<{ type: 'percent'|'fixed'; value: string }>({ type:'fixed', value:'0' });
  const [discountReasonId, setDiscountReasonId] = useState('');
  const [discountReasons,  setDiscountReasons]  = useState<any[]>([]);
  // Gorjeta compulsória de 10% aplicada por padrão; caixa pode remover ou editar (% ou R$)
  const [surcharge, setSurcharge] = useState<{ type: 'percent'|'fixed'|''; value: string }>({ type:'percent', value:'10' });
  const [payments,  setPayments]  = useState<Payment[]>([{ method:'CASH', amount:'' }]);

  const [paying, setPaying]     = useState(false);
  const [payError, setPayError] = useState('');
  const [showPay,  setShowPay]  = useState(false);

  const [cancelReasons, setCancelReasons] = useState<any[]>([]);
  const [cancelTarget, setCancelTarget]   = useState<any>(null);
  const [cancelReasonId, setCancelReasonId] = useState('');
  const [cancelPassword, setCancelPassword] = useState('');
  const [cancelling, setCancelling]         = useState(false);
  const [cancelError, setCancelError]       = useState('');

  // Adicionar itens pela tela do caixa
  const [showAddItems, setShowAddItems]     = useState(false);
  const [menuItems, setMenuItems]           = useState<any[]>([]);
  const [addCat, setAddCat]                 = useState<string|null>(null);
  const [addCart, setAddCart]               = useState<{ item:any; qty:number }[]>([]);
  const [askPrint, setAskPrint]             = useState(false);
  const [addingItems, setAddingItems]       = useState(false);
  const [addItemsError, setAddItemsError]   = useState('');

  // Transferir itens / trocar mesa
  const [showTransfer, setShowTransfer]         = useState(false);
  const [transferMode, setTransferMode]         = useState<'send'|'receive'|'table'>('send');
  const [otherComandas, setOtherComandas]       = useState<any[]>([]);
  const [transferFilter, setTransferFilter]     = useState('');
  const [transferSourceId, setTransferSourceId] = useState('');
  const [transferTargetId, setTransferTargetId] = useState('');
  const [transferSelected, setTransferSelected] = useState<Set<string>>(new Set());
  const [tables, setTables]                     = useState<any[]>([]);
  const [transferTableId, setTransferTableId]   = useState('');
  const [transferring, setTransferring]         = useState(false);
  const [transferError, setTransferError]       = useState('');

  // Resumo para conferência
  const [printingSummary, setPrintingSummary] = useState(false);
  const [summaryMsg, setSummaryMsg]           = useState('');
  const [summaryError, setSummaryError]       = useState('');

  const initedSurcharge = useRef(false);

  useEffect(() => {
    reasonsApi.cancellation.list().then((r:any) => setCancelReasons(r)).catch(()=>{});
    reasonsApi.discount.list().then((r:any) => setDiscountReasons(r)).catch(()=>{});
  }, []);

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

  const addCategories = [...new Set(menuItems.map((i:any) => i.category))] as string[];
  const addCurCat     = addCat ?? addCategories[0];
  const addVisible    = menuItems.filter((i:any) => i.category === addCurCat && i.available);

  const subtotal   = (comanda?.items ?? []).reduce((s:number,i:any) => s + i.quantity * parseFloat(i.unitPrice), 0);
  const discRaw    = discount.type === 'percent' ? subtotal * (parseFloat(discount.value)||0) / 100 : (parseFloat(discount.value)||0);
  const discVal    = Math.min(subtotal, Math.max(0, discRaw));
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

  function openCancelModal(item: any) {
    setCancelTarget(item);
    setCancelReasonId('');
    setCancelPassword('');
    setCancelError('');
  }

  async function confirmCancelItem() {
    if (!id || !cancelTarget) return;
    if (!cancelReasonId) { setCancelError('Selecione um motivo.'); return; }
    if (!cancelPassword) { setCancelError('Informe a senha de segurança.'); return; }
    setCancelling(true); setCancelError('');
    try {
      await comandasApi.removeItem(id, cancelTarget.id, { reasonId: cancelReasonId, password: cancelPassword });
      setCancelTarget(null);
      await load();
    } catch (e:any) {
      setCancelError(e.message);
    } finally {
      setCancelling(false);
    }
  }

  // ── Adicionar itens ────────────────────────────────────────────────────

  function openAddItems() {
    setShowAddItems(true);
    setAddCart([]);
    setAddItemsError('');
    setAskPrint(false);
    if (!menuItems.length) menuApi.list().then((d:any) => setMenuItems(d)).catch(()=>{});
  }

  function addToCart(item: any) {
    setAddCart(prev => {
      const idx = prev.findIndex(c => c.item.id === item.id);
      if (idx >= 0) { const n=[...prev]; n[idx]={...n[idx],qty:n[idx].qty+1}; return n; }
      return [...prev, { item, qty:1 }];
    });
  }
  function changeCartQty(idx:number, delta:number) {
    setAddCart(prev => { const n=[...prev]; n[idx]={...n[idx], qty: Math.max(1, n[idx].qty+delta)}; return n; });
  }
  function removeFromCart(idx:number) {
    setAddCart(prev => prev.filter((_,i) => i !== idx));
  }

  async function submitAddItems(print: boolean) {
    if (!id || !addCart.length) return;
    setAddingItems(true); setAddItemsError('');
    try {
      await comandasApi.addItems(id, addCart.map(c => ({ menuItemId:c.item.id, quantity:c.qty })), print);
      setShowAddItems(false); setAskPrint(false); setAddCart([]);
      await load();
    } catch(e:any) {
      setAddItemsError(e.message);
      setAskPrint(false);
    } finally {
      setAddingItems(false);
    }
  }

  // ── Transferir itens / trocar mesa ─────────────────────────────────────

  function openTransfer() {
    setShowTransfer(true);
    setTransferMode('send');
    setTransferFilter('');
    setTransferSourceId('');
    setTransferTargetId('');
    setTransferSelected(new Set());
    setTransferTableId('');
    setTransferError('');
    comandasApi.list().then((d:any) =>
      setOtherComandas(d.filter((c:any) => c.id !== id && c.status !== 'CLOSED' && c.status !== 'CANCELLED'))
    ).catch(()=>{});
    if (!tables.length) tablesApi.list().then((d:any) => setTables(d)).catch(()=>{});
  }

  function toggleTransferItem(itemId: string) {
    setTransferSelected(prev => {
      const n = new Set(prev);
      if (n.has(itemId)) n.delete(itemId); else n.add(itemId);
      return n;
    });
  }

  function switchTransferMode(mode: 'send'|'receive'|'table') {
    setTransferMode(mode);
    setTransferSelected(new Set());
    setTransferSourceId('');
    setTransferError('');
  }

  async function confirmSend() {
    if (!id) return;
    if (!transferSelected.size) { setTransferError('Selecione ao menos um item.'); return; }
    if (!transferTargetId) { setTransferError('Selecione a comanda de destino.'); return; }
    setTransferring(true); setTransferError('');
    try {
      await comandasApi.transferItems(id, { itemIds: [...transferSelected], targetComandaId: transferTargetId });
      setShowTransfer(false);
      await load();
    } catch(e:any) { setTransferError(e.message); }
    finally { setTransferring(false); }
  }

  async function confirmReceive() {
    if (!id) return;
    if (!transferSourceId) { setTransferError('Selecione a comanda de origem.'); return; }
    if (!transferSelected.size) { setTransferError('Selecione ao menos um item.'); return; }
    setTransferring(true); setTransferError('');
    try {
      await comandasApi.transferItems(transferSourceId, { itemIds: [...transferSelected], targetComandaId: id });
      setShowTransfer(false);
      await load();
    } catch(e:any) { setTransferError(e.message); }
    finally { setTransferring(false); }
  }

  async function confirmChangeTable() {
    if (!id) return;
    if (!transferTableId) { setTransferError('Selecione a mesa de destino.'); return; }
    setTransferring(true); setTransferError('');
    try {
      await comandasApi.changeTable(id, { tableId: transferTableId });
      setShowTransfer(false);
      await load();
    } catch(e:any) { setTransferError(e.message); }
    finally { setTransferring(false); }
  }

  // ── Resumo para conferência do cliente ─────────────────────────────────

  async function handlePrintSummary() {
    if (!id) return;
    setPrintingSummary(true); setSummaryError(''); setSummaryMsg('');
    try {
      await comandasApi.printSummary(id);
      setSummaryMsg('✓ Resumo enviado para a impressora!');
      setTimeout(() => setSummaryMsg(''), 3000);
    } catch(e:any) {
      setSummaryError(e.message);
      setTimeout(() => setSummaryError(''), 4000);
    } finally {
      setPrintingSummary(false);
    }
  }

  function selectDiscountReason(reasonId: string) {
    setDiscountReasonId(reasonId);
    const r = discountReasons.find((x:any) => x.id === reasonId);
    if (r) setDiscount({ type: r.type, value: String(r.value) });
    else setDiscount({ type:'fixed', value:'0' });
  }

  async function pay() {
    if (remaining > 0.01) { setPayError('Valor recebido insuficiente.'); return; }
    const validPays = payments.filter(p => parseFloat(p.amount) > 0);
    if (total > 0 && !validPays.length) { setPayError('Adicione ao menos um pagamento.'); return; }
    setPaying(true); setPayError('');
    try {
      await comandasApi.pay(id!, {
        payments: validPays.map(p => ({ method: p.method, amount: parseFloat(p.amount) })),
        discountType:   discVal > 0 ? discount.type : undefined,
        discountValue:  discVal > 0 ? (parseFloat(discount.value) || 0) : undefined,
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
            {comanda?.status !== 'CLOSED' && (
              <div style={{ display:'flex', gap:8 }}>
                <PillBtn small variant="ghost" onClick={openTransfer}>🔀 Transferir</PillBtn>
                <PillBtn small variant="secondary" onClick={openAddItems}>+ Adicionar</PillBtn>
              </div>
            )}
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
                <div style={{ textAlign:'right', flexShrink:0, marginLeft:12, display:'flex', alignItems:'center', gap:10 }}>
                  <div>
                    <div style={{ fontSize:12, color:'#999' }}>{item.quantity}x {fmtBRL(item.unitPrice)}</div>
                    <div style={{ fontWeight:900, color:BRAND.navy, fontSize:15 }}>{fmtBRL(item.quantity * parseFloat(item.unitPrice))}</div>
                  </div>
                  {comanda?.status !== 'CLOSED' && (
                    <button onClick={()=>openCancelModal(item)} title="Cancelar item"
                      style={{ background:'none', border:'none', color:BRAND.red, fontSize:18, cursor:'pointer', padding:4 }}>
                      ✕
                    </button>
                  )}
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
              <div style={{ marginBottom:8 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ color:'#666', fontSize:13 }}>Desconto</span>
                  <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                    <select value={discount.type}
                      onChange={e=>{ setDiscount(d=>({ ...d, type:e.target.value as 'percent'|'fixed' })); setDiscountReasonId(''); }}
                      style={{ border:`1.5px solid ${BRAND.navy}`, borderRadius:8, padding:'5px 6px', fontSize:12, fontWeight:700, outline:'none' }}>
                      <option value="fixed">R$</option>
                      <option value="percent">%</option>
                    </select>
                    <input type="number" min="0" step="0.01" value={discount.value}
                      onChange={e=>{ setDiscount(d=>({ ...d, value:e.target.value })); setDiscountReasonId(''); }}
                      style={{ width:80, textAlign:'right', border:`1.5px solid ${BRAND.navy}`, borderRadius:8, padding:'5px 10px', fontSize:14, fontWeight:700, outline:'none' }} />
                  </div>
                </div>
                {discountReasons.length > 0 && (
                  <select value={discountReasonId} onChange={e=>selectDiscountReason(e.target.value)}
                    style={{ width:'100%', boxSizing:'border-box', border:'1.5px solid #ddd', borderRadius:8, padding:'6px 10px', fontSize:12, outline:'none', marginTop:8, background:'#fff', color:'#666' }}>
                    <option value="">Motivo do desconto (opcional)</option>
                    {discountReasons.map((r:any) => (
                      <option key={r.id} value={r.id}>{r.label} ({r.type==='percent' ? `${r.value}%` : fmtBRL(r.value)})</option>
                    ))}
                  </select>
                )}
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
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
            <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
              <PillBtn variant="ghost" onClick={handlePrintSummary} disabled={printingSummary}>
                {printingSummary ? 'Imprimindo…' : '🖨 Imprimir Resumo'}
              </PillBtn>
              <PillBtn onClick={()=>setShowPay(true)}>Fechar Conta</PillBtn>
            </div>
            {summaryMsg && <p style={{ color:BRAND.green, fontWeight:700, fontSize:13, margin:0 }}>{summaryMsg}</p>}
            {summaryError && <p style={{ color:BRAND.red, fontWeight:700, fontSize:13, margin:0 }}>{summaryError}</p>}
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
              {discVal>0 && <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'#666', marginBottom:4 }}><span>Desconto {discount.type==='percent' ? `(${discount.value}%)` : ''}</span><span style={{ color:BRAND.green }}>−{fmtBRL(discVal)}</span></div>}
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

      {/* Cancelar item */}
      {cancelTarget && (
        <div style={{ position:'fixed', inset:0, background:'rgba(13,27,42,.8)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:150 }}
          onClick={e=>{ if (e.target === e.currentTarget) setCancelTarget(null); }}>
          <div style={{ background:BRAND.cream, borderRadius:'24px 24px 0 0', borderTop:`3px solid ${BRAND.navy}`, padding:'24px 20px 40px', width:'100%', maxWidth:420 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div style={{ fontWeight:900, fontSize:18, color:BRAND.navy }}>Cancelar Item</div>
              <button onClick={()=>setCancelTarget(null)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:BRAND.navy }}>✕</button>
            </div>
            <p style={{ fontSize:14, color:BRAND.orange, fontWeight:700, marginBottom:16 }}>
              {cancelTarget.menuItem?.name ?? 'Item'} — {cancelTarget.quantity}x
            </p>

            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#666', marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}>
                Motivo do cancelamento
              </label>
              <select value={cancelReasonId} onChange={e=>setCancelReasonId(e.target.value)}
                style={{ width:'100%', boxSizing:'border-box', border:`2px solid ${BRAND.navy}`, borderRadius:10, padding:'10px 12px', fontSize:14, outline:'none', fontFamily:'inherit', background:'#fff' }}>
                <option value="">Selecione…</option>
                {cancelReasons.map((r:any) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </div>

            <div style={{ marginBottom:8 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#666', marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}>
                Senha de segurança
              </label>
              <input type="password" value={cancelPassword} onChange={e=>setCancelPassword(e.target.value)}
                onKeyDown={e=>e.key==='Enter' && confirmCancelItem()}
                style={{ width:'100%', boxSizing:'border-box', border:`2px solid ${BRAND.navy}`, borderRadius:10, padding:'10px 12px', fontSize:14, outline:'none', fontFamily:'inherit' }} />
            </div>

            {cancelError && <p style={{ color:BRAND.red, fontSize:13, fontWeight:700, marginBottom:12 }}>{cancelError}</p>}

            <div style={{ display:'flex', gap:12, marginTop:12 }}>
              <PillBtn variant="ghost" onClick={()=>setCancelTarget(null)}>Voltar</PillBtn>
              <PillBtn variant="danger" onClick={confirmCancelItem} disabled={cancelling}>
                {cancelling ? 'Cancelando…' : 'Confirmar Cancelamento'}
              </PillBtn>
            </div>
          </div>
        </div>
      )}

      {/* Adicionar itens */}
      {showAddItems && (
        <div style={{ position:'fixed', inset:0, background:'rgba(13,27,42,.85)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:160 }}
          onClick={e=>{ if (e.target === e.currentTarget && !askPrint) setShowAddItems(false); }}>
          <div style={{ background:BRAND.cream, borderRadius:'24px 24px 0 0', borderTop:`3px solid ${BRAND.navy}`, padding:'24px 20px 40px', width:'100%', maxWidth:480, maxHeight:'85vh', overflowY:'auto' }}>
            {!askPrint ? (
              <>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                  <div style={{ fontWeight:900, fontSize:18, color:BRAND.navy }}>Adicionar Itens</div>
                  <button onClick={()=>setShowAddItems(false)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:BRAND.navy }}>✕</button>
                </div>

                <div style={{ display:'flex', gap:8, marginBottom:14, overflowX:'auto' }}>
                  {addCategories.map((c:string) => (
                    <button key={c} onClick={()=>setAddCat(c)} style={{
                      flexShrink:0, padding:'8px 16px', borderRadius:999, cursor:'pointer', fontWeight:700, fontSize:13, fontFamily:'inherit',
                      border:`2px solid ${addCurCat===c ? BRAND.orange : '#ddd'}`,
                      background: addCurCat===c ? BRAND.orange : '#fff',
                      color:       addCurCat===c ? '#fff' : BRAND.navy,
                    }}>
                      {CAT_LABEL[c] ?? c}
                    </button>
                  ))}
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10, marginBottom:16 }}>
                  {addVisible.map((item:any) => {
                    const inCart = addCart.filter(c => c.item.id === item.id).reduce((s,c) => s+c.qty, 0);
                    return (
                      <button key={item.id} onClick={()=>addToCart(item)} style={{
                        position:'relative', background:'#fff', border:`2px solid ${inCart ? BRAND.orange : '#ddd'}`, borderRadius:12,
                        padding:'12px 10px', textAlign:'left', cursor:'pointer', fontFamily:'inherit',
                      }}>
                        {inCart > 0 && <span style={{ position:'absolute', top:-6, right:-6, background:BRAND.orange, color:'#fff', borderRadius:999, width:20, height:20, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900 }}>{inCart}</span>}
                        <div style={{ fontWeight:700, fontSize:13, color:BRAND.navy }}>{item.name}</div>
                        <div style={{ fontWeight:900, fontSize:13, color:BRAND.orange, marginTop:4 }}>{fmtBRL(item.price)}</div>
                      </button>
                    );
                  })}
                  {!addVisible.length && <p style={{ color:'#aaa', fontSize:13 }}>Nenhum item disponível nesta categoria</p>}
                </div>

                {addCart.length > 0 && (
                  <div style={{ background:'#fff', borderRadius:12, border:`1.5px solid ${BRAND.navy}`, padding:12, marginBottom:16 }}>
                    {addCart.map((c,idx) => (
                      <div key={idx} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom: idx < addCart.length-1 ? '1px solid #f0ebe5' : 'none' }}>
                        <span style={{ fontSize:13, fontWeight:600, color:BRAND.navy }}>{c.item.name}</span>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <button onClick={()=>changeCartQty(idx,-1)} style={{ width:24, height:24, borderRadius:'50%', border:`1.5px solid ${BRAND.navy}`, background:'transparent', cursor:'pointer', fontWeight:900 }}>−</button>
                          <span style={{ fontWeight:800, minWidth:16, textAlign:'center' }}>{c.qty}</span>
                          <button onClick={()=>changeCartQty(idx,+1)} style={{ width:24, height:24, borderRadius:'50%', border:`1.5px solid ${BRAND.navy}`, background:'transparent', cursor:'pointer', fontWeight:900 }}>+</button>
                          <button onClick={()=>removeFromCart(idx)} style={{ background:'none', border:'none', color:BRAND.red, cursor:'pointer', fontSize:15 }}>✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {addItemsError && <p style={{ color:BRAND.red, fontSize:13, fontWeight:700, marginBottom:12 }}>{addItemsError}</p>}
                <PillBtn onClick={()=>setAskPrint(true)} disabled={!addCart.length}>
                  Continuar ({addCart.reduce((s,c)=>s+c.qty,0)} itens)
                </PillBtn>
              </>
            ) : (
              <>
                <div style={{ fontWeight:900, fontSize:18, color:BRAND.navy, marginBottom:12, textAlign:'center' }}>
                  Imprimir pedido nas impressoras térmicas?
                </div>
                <p style={{ textAlign:'center', color:'#666', fontSize:13, marginBottom:20 }}>
                  {addCart.reduce((s,c)=>s+c.qty,0)} item(ns) — o pedido é enviado para cozinha/bar se você optar por imprimir.
                </p>
                {addItemsError && <p style={{ color:BRAND.red, fontSize:13, fontWeight:700, textAlign:'center', marginBottom:12 }}>{addItemsError}</p>}
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  <PillBtn onClick={()=>submitAddItems(true)} disabled={addingItems}>
                    {addingItems ? 'Enviando…' : '🖨 Sim, imprimir'}
                  </PillBtn>
                  <PillBtn variant="secondary" onClick={()=>submitAddItems(false)} disabled={addingItems}>
                    Não imprimir
                  </PillBtn>
                  <PillBtn variant="ghost" onClick={()=>setAskPrint(false)} disabled={addingItems}>← Voltar ao pedido</PillBtn>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Transferir itens / trocar mesa */}
      {showTransfer && (
        <div style={{ position:'fixed', inset:0, background:'rgba(13,27,42,.85)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:160 }}
          onClick={e=>{ if (e.target === e.currentTarget) setShowTransfer(false); }}>
          <div style={{ background:BRAND.cream, borderRadius:'24px 24px 0 0', borderTop:`3px solid ${BRAND.navy}`, padding:'24px 20px 40px', width:'100%', maxWidth:480, maxHeight:'85vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div style={{ fontWeight:900, fontSize:18, color:BRAND.navy }}>Transferir Itens</div>
              <button onClick={()=>setShowTransfer(false)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:BRAND.navy }}>✕</button>
            </div>

            <div style={{ display:'flex', gap:8, marginBottom:18 }}>
              {([
                { id:'send',    label:'Enviar Itens' },
                { id:'receive', label:'Receber Itens' },
                { id:'table',   label:'Trocar Mesa' },
              ] as const).map(t => (
                <button key={t.id} onClick={()=>switchTransferMode(t.id)} style={{
                  flex:1, padding:'8px 4px', borderRadius:10, cursor:'pointer', fontWeight:700, fontSize:12, fontFamily:'inherit',
                  background: transferMode===t.id ? BRAND.navy : '#fff',
                  color:       transferMode===t.id ? BRAND.yellow : BRAND.navy,
                  border: transferMode===t.id ? 'none' : '1.5px solid #ddd',
                }}>
                  {t.label}
                </button>
              ))}
            </div>

            {transferMode === 'send' && (
              <>
                <div style={{ fontSize:12, fontWeight:700, color:'#666', textTransform:'uppercase', marginBottom:8 }}>Itens desta comanda</div>
                {(comanda?.items ?? []).length === 0 ? (
                  <p style={{ color:'#aaa', fontSize:13 }}>Nenhum item para enviar</p>
                ) : (
                  <div style={{ background:'#fff', borderRadius:12, border:'1.5px solid #ddd', marginBottom:16, maxHeight:180, overflowY:'auto' }}>
                    {comanda.items.map((item:any) => (
                      <label key={item.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderBottom:'1px solid #f0ebe5', cursor:'pointer' }}>
                        <input type="checkbox" checked={transferSelected.has(item.id)} onChange={()=>toggleTransferItem(item.id)} />
                        <span style={{ flex:1, fontSize:13, color:BRAND.navy, fontWeight:600 }}>{item.quantity}x {item.menuItem?.name}</span>
                        <span style={{ fontSize:12, color:'#999' }}>{fmtBRL(item.quantity * parseFloat(item.unitPrice))}</span>
                      </label>
                    ))}
                  </div>
                )}

                <div style={{ fontSize:12, fontWeight:700, color:'#666', textTransform:'uppercase', marginBottom:8 }}>Comanda de destino</div>
                <input value={transferFilter} onChange={e=>setTransferFilter(e.target.value)} placeholder="Buscar mesa ou cliente…"
                  style={{ width:'100%', boxSizing:'border-box', border:'1.5px solid #ddd', borderRadius:8, padding:'8px 12px', fontSize:13, outline:'none', marginBottom:8, fontFamily:'inherit' }} />
                <div style={{ background:'#fff', borderRadius:12, border:'1.5px solid #ddd', marginBottom:16, maxHeight:180, overflowY:'auto' }}>
                  {otherComandas
                    .filter((c:any) => `${c.table?.label ?? ''} ${c.customerName ?? ''}`.toLowerCase().includes(transferFilter.toLowerCase()))
                    .map((c:any) => (
                      <button key={c.id} onClick={()=>setTransferTargetId(c.id)} style={{
                        display:'block', width:'100%', textAlign:'left', padding:'10px 12px', border:'none', cursor:'pointer', fontFamily:'inherit',
                        background: transferTargetId===c.id ? `${BRAND.orange}18` : 'transparent',
                        borderBottom:'1px solid #f0ebe5',
                      }}>
                        <div style={{ fontWeight:700, fontSize:13, color:BRAND.navy }}>{c.table?.label ?? 'Sem mesa'}</div>
                        <div style={{ fontSize:12, color:'#999' }}>{c.customerName || 'Sem nome'} · {c.items?.length ?? 0} item(ns)</div>
                      </button>
                    ))}
                  {!otherComandas.length && <p style={{ color:'#aaa', fontSize:13, padding:12 }}>Nenhuma outra comanda ativa</p>}
                </div>

                {transferError && <p style={{ color:BRAND.red, fontSize:13, fontWeight:700, marginBottom:12 }}>{transferError}</p>}
                <PillBtn onClick={confirmSend} disabled={transferring}>{transferring ? 'Enviando…' : 'Enviar Itens'}</PillBtn>
              </>
            )}

            {transferMode === 'receive' && (
              <>
                <div style={{ fontSize:12, fontWeight:700, color:'#666', textTransform:'uppercase', marginBottom:8 }}>Comanda de origem</div>
                <input value={transferFilter} onChange={e=>setTransferFilter(e.target.value)} placeholder="Buscar mesa ou cliente…"
                  style={{ width:'100%', boxSizing:'border-box', border:'1.5px solid #ddd', borderRadius:8, padding:'8px 12px', fontSize:13, outline:'none', marginBottom:8, fontFamily:'inherit' }} />
                <div style={{ background:'#fff', borderRadius:12, border:'1.5px solid #ddd', marginBottom:16, maxHeight:150, overflowY:'auto' }}>
                  {otherComandas
                    .filter((c:any) => `${c.table?.label ?? ''} ${c.customerName ?? ''}`.toLowerCase().includes(transferFilter.toLowerCase()))
                    .map((c:any) => (
                      <button key={c.id} onClick={()=>{ setTransferSourceId(c.id); setTransferSelected(new Set()); }} style={{
                        display:'block', width:'100%', textAlign:'left', padding:'10px 12px', border:'none', cursor:'pointer', fontFamily:'inherit',
                        background: transferSourceId===c.id ? `${BRAND.orange}18` : 'transparent',
                        borderBottom:'1px solid #f0ebe5',
                      }}>
                        <div style={{ fontWeight:700, fontSize:13, color:BRAND.navy }}>{c.table?.label ?? 'Sem mesa'}</div>
                        <div style={{ fontSize:12, color:'#999' }}>{c.customerName || 'Sem nome'} · {c.items?.length ?? 0} item(ns)</div>
                      </button>
                    ))}
                  {!otherComandas.length && <p style={{ color:'#aaa', fontSize:13, padding:12 }}>Nenhuma outra comanda ativa</p>}
                </div>

                {transferSourceId && (() => {
                  const src = otherComandas.find((c:any) => c.id === transferSourceId);
                  const items = src?.items ?? [];
                  return (
                    <>
                      <div style={{ fontSize:12, fontWeight:700, color:'#666', textTransform:'uppercase', marginBottom:8 }}>Itens para receber</div>
                      {!items.length ? (
                        <p style={{ color:'#aaa', fontSize:13, marginBottom:16 }}>Comanda de origem não tem itens</p>
                      ) : (
                        <div style={{ background:'#fff', borderRadius:12, border:'1.5px solid #ddd', marginBottom:16, maxHeight:180, overflowY:'auto' }}>
                          {items.map((item:any) => (
                            <label key={item.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderBottom:'1px solid #f0ebe5', cursor:'pointer' }}>
                              <input type="checkbox" checked={transferSelected.has(item.id)} onChange={()=>toggleTransferItem(item.id)} />
                              <span style={{ flex:1, fontSize:13, color:BRAND.navy, fontWeight:600 }}>{item.quantity}x {item.menuItem?.name}</span>
                              <span style={{ fontSize:12, color:'#999' }}>{fmtBRL(item.quantity * parseFloat(item.unitPrice))}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}

                {transferError && <p style={{ color:BRAND.red, fontSize:13, fontWeight:700, marginBottom:12 }}>{transferError}</p>}
                <PillBtn onClick={confirmReceive} disabled={transferring}>{transferring ? 'Recebendo…' : 'Receber Itens'}</PillBtn>
              </>
            )}

            {transferMode === 'table' && (
              <>
                <div style={{ fontSize:12, fontWeight:700, color:'#666', textTransform:'uppercase', marginBottom:8 }}>Nova mesa/balcão</div>
                <select value={transferTableId} onChange={e=>setTransferTableId(e.target.value)}
                  style={{ width:'100%', boxSizing:'border-box', border:`2px solid ${BRAND.navy}`, borderRadius:10, padding:'10px 12px', fontSize:14, outline:'none', fontFamily:'inherit', background:'#fff', marginBottom:16 }}>
                  <option value="">Selecione…</option>
                  {tables.map((t:any) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>

                {transferError && <p style={{ color:BRAND.red, fontSize:13, fontWeight:700, marginBottom:12 }}>{transferError}</p>}
                <PillBtn onClick={confirmChangeTable} disabled={transferring}>{transferring ? 'Trocando…' : 'Trocar Mesa'}</PillBtn>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
