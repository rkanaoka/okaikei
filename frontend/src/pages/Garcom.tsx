import { useState, useEffect, useCallback } from 'react';
import { menuApi, tablesApi, comandasApi } from '@/services/api';

const BRAND = { navy:'#0D1B2A', yellow:'#FFD60A', orange:'#FF6B2B', red:'#E63946', navyLight:'#1A2E44', cream:'#FFF8F0' };
const fmtBRL = (v:any) => `R$ ${parseFloat(v).toFixed(2).replace('.',',')}`;

function PillBtn({ children, onClick, variant='primary', disabled=false, small=false }:any) {
  const styles: Record<string,any> = {
    primary:   { background:`linear-gradient(135deg,${BRAND.orange},${BRAND.red})`, color:'#fff' },
    secondary: { background:BRAND.yellow, color:BRAND.navy },
    ghost:     { background:'transparent', border:`2px solid ${BRAND.navy}`, color:BRAND.navy },
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

function Toast({ msg, type, onDone }:any) {
  useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t); });
  return (
    <div style={{
      position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)',
      background: type==='error' ? BRAND.red : BRAND.orange, color:'#fff',
      padding:'14px 28px', borderRadius:'999px', fontWeight:700, fontSize:15,
      boxShadow:'0 4px 24px rgba(0,0,0,.4)', zIndex:1000,
    }}>
      {msg}
    </div>
  );
}

// ── Agrupamento de mesas/balcões ────────────────────────────────────────────
function tableGroup(label: string) {
  if (label.startsWith('Mesa Externa')) return 'Mesa Externa';
  if (label.startsWith('Mesa')) return 'Mesas';
  if (label.startsWith('Balcão')) return 'Balcão';
  return 'Outros';
}
const TABLE_GROUPS = ['Mesas', 'Balcão', 'Mesa Externa', 'Outros'];

// ── Tela 1: Selecionar mesa/balcão ──────────────────────────────────────────
function TablesScreen({ onSelect }:{ onSelect:(table:any)=>void }) {
  const [tables, setTables] = useState<any[]>([]);
  const [filter, setFilter] = useState('');

  useEffect(() => { tablesApi.list().then((t:any) => setTables(t)).catch(()=>{}); }, []);

  const filtered = tables.filter((t) => t.label.toLowerCase().includes(filter.trim().toLowerCase()));

  return (
    <div style={{ minHeight:'100vh', background:BRAND.navy, display:'flex', flexDirection:'column', alignItems:'center', padding:'32px 16px 40px', gap:28 }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:36, fontWeight:900, letterSpacing:4, color:BRAND.yellow, textShadow:'0 0 30px rgba(255,214,10,.4)' }}>BODOGAMI</div>
        <div style={{ color:'#fff8', fontSize:13, letterSpacing:2, marginTop:4 }}>Sistema de Pedidos</div>
      </div>

      <div style={{ background:BRAND.cream, borderRadius:20, padding:'28px 24px', width:'100%', maxWidth:420, border:`3px solid ${BRAND.navy}`, boxShadow:`6px 6px 0 ${BRAND.yellow}` }}>
        <h2 style={{ fontSize:20, fontWeight:900, color:BRAND.navy, marginBottom:16 }}>Selecionar Mesa</h2>

        <input
          value={filter} onChange={e=>setFilter(e.target.value)}
          placeholder="Buscar… (ex: 23, balcão, externa)"
          style={{ width:'100%', boxSizing:'border-box', border:`2px solid ${BRAND.navy}`, borderRadius:12, padding:'12px 16px', fontSize:16, background:'#fff', outline:'none', marginBottom:20 }}
        />

        {TABLE_GROUPS.map((group) => {
          const items = filtered.filter((t) => tableGroup(t.label) === group);
          if (!items.length) return null;
          return (
            <div key={group} style={{ marginBottom:18 }}>
              <div style={{ fontSize:12, fontWeight:700, color:BRAND.navy, textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>{group}</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                {items.map((t) => (
                  <button key={t.id} onClick={() => onSelect(t)} style={{
                    borderRadius:12, border:`2px solid ${BRAND.navy}`, cursor:'pointer', padding:'10px 4px',
                    fontWeight:700, fontSize:13, fontFamily:'inherit', transition:'all .15s',
                    background: t.status === 'OCCUPIED' ? BRAND.navy : '#fff',
                    color:       t.status === 'OCCUPIED' ? BRAND.yellow : BRAND.navy,
                  }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        {!filtered.length && <p style={{ color:BRAND.navy, fontSize:14, textAlign:'center', padding:'12px 0' }}>Nenhuma mesa encontrada</p>}
      </div>
    </div>
  );
}

// ── Tela 2: Comandas da mesa/balcão ─────────────────────────────────────────
function TableComandasScreen({ table, onBack, onOpenOrder }:{ table:any; onBack:()=>void; onOpenOrder:(c:any)=>void }) {
  const [comandas, setComandas] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [creating, setCreating] = useState(false);
  const [customer, setCustomer] = useState('');
  const [opening, setOpening]   = useState(false);
  const [error, setError]       = useState('');

  const load = useCallback(() => {
    setLoading(true);
    comandasApi.list()
      .then((data:any) => setComandas(data.filter((c:any) => c.tableId === table.id && c.status !== 'CLOSED')))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [table.id]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    setOpening(true); setError('');
    try {
      const comanda = await comandasApi.open({ tableId: table.id, customerName: customer || undefined });
      onOpenOrder(comanda);
    } catch (e:any) {
      setError(e.message);
    } finally {
      setOpening(false);
    }
  }

  return (
    <div style={{ minHeight:'100vh', background:BRAND.navy, display:'flex', flexDirection:'column', alignItems:'center', padding:'32px 16px 40px', gap:20 }}>
      <div style={{ width:'100%', maxWidth:420, display:'flex', alignItems:'center', gap:16 }}>
        <button onClick={onBack} style={{ background:'none', border:'none', color:BRAND.yellow, fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:'inherit', padding:'8px 0' }}>← Mesas</button>
        <div style={{ fontSize:20, fontWeight:900, color:BRAND.yellow }}>{table.label}</div>
      </div>

      <div style={{ background:BRAND.cream, borderRadius:20, padding:'28px 24px', width:'100%', maxWidth:420, border:`3px solid ${BRAND.navy}`, boxShadow:`6px 6px 0 ${BRAND.yellow}` }}>
        <h2 style={{ fontSize:20, fontWeight:900, color:BRAND.navy, marginBottom:16 }}>Comandas</h2>

        {loading && <p style={{ color:BRAND.navyLight, fontSize:14, opacity:.7 }}>Carregando…</p>}
        {!loading && !comandas.length && <p style={{ color:BRAND.navyLight, fontSize:14, opacity:.7 }}>Nenhuma comanda aberta nesta mesa</p>}

        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {comandas.map((c) => (
            <button key={c.id} onClick={() => onOpenOrder(c)} style={{
              textAlign:'left', borderRadius:14, border:`2px solid ${BRAND.navy}`, background:'#fff',
              padding:'14px 16px', cursor:'pointer', fontFamily:'inherit',
            }}>
              <div style={{ fontWeight:800, fontSize:15, color:BRAND.navy }}>{c.customerName || 'Sem nome'}</div>
              <div style={{ fontSize:13, color:BRAND.navyLight, marginTop:2 }}>
                {c.items?.length ?? 0} {c.items?.length === 1 ? 'item' : 'itens'} · {fmtBRL(c.subtotal)}
              </div>
            </button>
          ))}
        </div>

        {!creating ? (
          <div style={{ marginTop:20 }}>
            <PillBtn onClick={() => setCreating(true)}>+ Nova Comanda</PillBtn>
          </div>
        ) : (
          <div style={{ marginTop:20, paddingTop:20, borderTop:'2px solid #e0d8d0' }}>
            <div style={{ fontSize:12, fontWeight:700, color:BRAND.navyLight, textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>
              Nome do cliente <span style={{ fontWeight:400, textTransform:'none', opacity:.6 }}>(opcional)</span>
            </div>
            <input
              value={customer} onChange={e=>setCustomer(e.target.value)}
              placeholder="Ex: João, grupo da reunião…"
              onKeyDown={e=>e.key==='Enter'&&handleCreate()}
              autoFocus
              style={{ width:'100%', boxSizing:'border-box', border:`2px solid ${BRAND.navy}`, borderRadius:12, padding:'12px 16px', fontSize:16, background:'#fff', outline:'none' }}
            />
            {error && <p style={{ color:BRAND.red, fontSize:13, fontWeight:700, marginTop:12 }}>{error}</p>}
            <div style={{ display:'flex', gap:12, marginTop:16 }}>
              <PillBtn onClick={handleCreate} disabled={opening}>{opening ? 'Abrindo…' : '✓ Abrir Comanda'}</PillBtn>
              <PillBtn variant="ghost" onClick={() => { setCreating(false); setCustomer(''); setError(''); }}>Cancelar</PillBtn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tela 3: Adicionar Itens ────────────────────────────────────────────────────
function AddItems({ comanda, onClose }:any) {
  const [items, setItems]     = useState<any[]>([]);
  const [cart, setCart]       = useState<any[]>([]);
  const [cat, setCat]         = useState<string|null>(null);
  const [noteIdx, setNoteIdx] = useState<number|null>(null);
  const [noteText, setNote]   = useState('');
  const [sending, setSending] = useState(false);
  const [toast, setToast]     = useState<any>(null);

  useEffect(() => { menuApi.list().then((d:any) => setItems(d.filter((i:any)=>i.available))); }, []);

  const cats    = [...new Set(items.map((i:any) => i.category))];
  const curCat  = cat ?? cats[0];
  const visible = items.filter((i:any) => i.category === curCat);
  const catLabel: Record<string,string> = { kitchen:'🍱 Cozinha', bar:'🍺 Bar', cashier:'💰 Caixa' };

  function addToCart(item: any) {
    setCart(prev => {
      const idx = prev.findIndex(c => c.item.id === item.id);
      if (idx >= 0) { const n=[...prev]; n[idx]={...n[idx],qty:n[idx].qty+1}; return n; }
      return [...prev, { item, qty:1, notes:'' }];
    });
  }

  async function send() {
    if (!cart.length) return;
    setSending(true);
    try {
      await comandasApi.addItems(comanda.id, cart.map(c=>({ menuItemId:c.item.id, quantity:c.qty, notes:c.notes||undefined })));
      setToast({ msg:'✓ Pedido enviado!', type:'success' });
      setCart([]);
    } catch(e:any) { setToast({ msg:e.message, type:'error' }); }
    finally { setSending(false); }
  }

  return (
    <div style={{ minHeight:'100vh', background:BRAND.navy, display:'flex', flexDirection:'column', paddingBottom:40 }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'20px 16px 12px', borderBottom:`2px solid ${BRAND.navyLight}` }}>
        <div>
          <div style={{ fontSize:22, fontWeight:900, color:BRAND.yellow }}>{comanda.table?.label ?? 'Sem mesa'}</div>
          {comanda.customerName && <div style={{ fontSize:13, color:'#fff8', marginTop:2 }}>{comanda.customerName}</div>}
        </div>
        <PillBtn variant="secondary" small onClick={onClose}>Fechar</PillBtn>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:8, padding:'12px 16px', overflowX:'auto' }}>
        {cats.map(c => (
          <button key={c} onClick={()=>setCat(c)} style={{
            flexShrink:0, padding:'8px 20px', borderRadius:'999px',
            border:`2px solid ${curCat===c?BRAND.orange:'#fff3'}`,
            background: curCat===c ? BRAND.orange : 'transparent',
            color: curCat===c ? '#fff' : '#fff8',
            fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:'inherit',
          }}>
            {catLabel[c] ?? c}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12, padding:'12px 16px', flex:1 }}>
        {visible.map((item:any) => {
          const inCart = cart.filter(c=>c.item.id===item.id).reduce((s:number,c:any)=>s+c.qty,0);
          return (
            <button key={item.id} onClick={()=>addToCart(item)} style={{
              position:'relative', background:BRAND.navyLight, borderRadius:16,
              border:`2px solid ${inCart?BRAND.orange:'transparent'}`, padding:'18px 14px',
              textAlign:'left', cursor:'pointer', fontFamily:'inherit',
            }}>
              {inCart>0 && <span style={{ position:'absolute', top:-8, right:-8, background:BRAND.orange, color:'#fff', borderRadius:'999px', width:24, height:24, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:900 }}>{inCart}</span>}
              <div style={{ color:'#fff', fontWeight:700, fontSize:15, lineHeight:1.3 }}>{item.name}</div>
              <div style={{ color:BRAND.yellow, fontWeight:900, fontSize:14, marginTop:8 }}>{fmtBRL(item.price)}</div>
            </button>
          );
        })}
      </div>

      {/* Cart */}
      {cart.length > 0 && (
        <div style={{ position:'sticky', bottom:0, background:BRAND.cream, borderRadius:'20px 20px 0 0', borderTop:`3px solid ${BRAND.navy}`, padding:'20px 16px', boxShadow:'0 -8px 40px rgba(0,0,0,.4)' }}>
          <div style={{ fontSize:14, fontWeight:900, color:BRAND.navy, textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>Pedido atual</div>
          {cart.map((c,idx) => (
            <div key={idx} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:`1px solid #e0d8d0` }}>
              <div>
                <div style={{ fontWeight:700, fontSize:14, color:BRAND.navy }}>{c.item.name}</div>
                {c.notes && <div style={{ fontSize:12, color:BRAND.orange, marginTop:2 }}>📝 {c.notes}</div>}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <button onClick={()=>setCart(p=>{const n=[...p];n[idx]={...n[idx],qty:Math.max(1,n[idx].qty-1)};return n;})} style={{ width:28,height:28,borderRadius:'50%',border:`2px solid ${BRAND.navy}`,background:'transparent',fontWeight:900,fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:BRAND.navy }}>−</button>
                <span style={{ fontWeight:900, fontSize:15, color:BRAND.navy, minWidth:20, textAlign:'center' }}>{c.qty}</span>
                <button onClick={()=>setCart(p=>{const n=[...p];n[idx]={...n[idx],qty:n[idx].qty+1};return n;})} style={{ width:28,height:28,borderRadius:'50%',border:`2px solid ${BRAND.navy}`,background:'transparent',fontWeight:900,fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:BRAND.navy }}>+</button>
                <button onClick={()=>{setNoteIdx(idx);setNote(c.notes);}} style={{ background:'none',border:'none',cursor:'pointer',fontSize:16 }}>✏️</button>
                <button onClick={()=>setCart(p=>p.filter((_,i)=>i!==idx))} style={{ background:'none',border:'none',cursor:'pointer',fontSize:16,color:BRAND.red }}>✕</button>
              </div>
            </div>
          ))}
          <div style={{ marginTop:16, textAlign:'center' }}>
            <PillBtn onClick={send} disabled={sending}>
              {sending ? 'Enviando…' : `Enviar (${cart.reduce((s,c)=>s+c.qty,0)} itens)`}
            </PillBtn>
          </div>
        </div>
      )}

      {/* Note modal */}
      {noteIdx !== null && (
        <div style={{ position:'fixed', inset:0, background:'rgba(13,27,42,.85)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:200 }} onClick={()=>setNoteIdx(null)}>
          <div style={{ background:BRAND.cream, borderRadius:'20px 20px 0 0', padding:'28px 24px', width:'100%', maxWidth:480, borderTop:`3px solid ${BRAND.navy}` }} onClick={e=>e.stopPropagation()}>
            <h3 style={{ fontSize:18, fontWeight:900, color:BRAND.navy, marginBottom:6 }}>Observação</h3>
            <p style={{ fontSize:14, color:BRAND.orange, fontWeight:700, marginBottom:16 }}>{cart[noteIdx]?.item.name}</p>
            <textarea value={noteText} onChange={e=>setNote(e.target.value)} placeholder="Ex: sem cebola…" rows={3} autoFocus
              style={{ width:'100%', boxSizing:'border-box', border:`2px solid ${BRAND.navy}`, borderRadius:12, padding:'12px 16px', fontSize:15, resize:'none', outline:'none' }} />
            <div style={{ display:'flex', gap:12, marginTop:16 }}>
              <PillBtn onClick={()=>{setCart(p=>{const n=[...p];n[noteIdx!]={...n[noteIdx!],notes:noteText};return n;});setNoteIdx(null);}}>Salvar</PillBtn>
              <PillBtn variant="ghost" onClick={()=>setNoteIdx(null)}>Cancelar</PillBtn>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)} />}
    </div>
  );
}

export default function Garcom() {
  const [view, setView] = useState<'tables' | 'table' | 'order'>('tables');
  const [selectedTable, setSelectedTable]     = useState<any>(null);
  const [selectedComanda, setSelectedComanda] = useState<any>(null);

  function goToTables() {
    setView('tables');
    setSelectedTable(null);
    setSelectedComanda(null);
  }
  function goToTable(table: any) {
    setSelectedTable(table);
    setView('table');
  }
  function openOrder(comanda: any) {
    setSelectedComanda(comanda);
    setView('order');
  }

  if (view === 'order' && selectedComanda) {
    return <AddItems comanda={selectedComanda} onClose={() => setView('table')} />;
  }
  if (view === 'table' && selectedTable) {
    return <TableComandasScreen table={selectedTable} onBack={goToTables} onOpenOrder={openOrder} />;
  }
  return <TablesScreen onSelect={goToTable} />;
}
