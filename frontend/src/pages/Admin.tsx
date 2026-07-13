import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { menuApi, comandasApi, reasonsApi, printTemplatesApi } from '@/services/api';
import http from '@/services/api';

const BRAND = {
  navy:'#0D1B2A', yellow:'#FFD60A', orange:'#FF6B2B', red:'#E63946',
  green:'#2DC653', navyLight:'#1A2E44', cream:'#FFF8F0', gray:'#f4f6f8',
};
const fmtBRL  = (v: any) => `R$ ${parseFloat(v||0).toFixed(2).replace('.',',')}`;
const fmtDate = (d: string) =>
  new Date(d).toLocaleString('pt-BR', { timeZone:'America/Sao_Paulo', day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });

// ─── Types ────────────────────────────────────────────────────────────────────
type SectionId =
  | 'dashboard'
  | 'cardapio'
  | 'fin-pagamentos' | 'fin-gorjetas'
  | 'rel-clientes'   | 'rel-cupons'
  | 'rel-itens'      | 'rel-faturamento' | 'rel-tempo'
  | 'estoque'
  | 'config-loja'    | 'config-horarios' | 'config-fiscal'
  | 'config-cancelamento' | 'config-desconto' | 'config-impressao';

const NAV: Array<
  | { type:'link';  id:SectionId; label:string; icon:string }
  | { type:'group'; label:string; icon:string; items:{ id:SectionId; label:string }[] }
> = [
  { type:'link',  id:'dashboard', label:'Dashboard', icon:'📊' },
  { type:'group', label:'Cardápio', icon:'🍽️', items:[
    { id:'cardapio', label:'Itens do Cardápio' },
  ]},
  { type:'group', label:'Financeiro', icon:'💰', items:[
    { id:'fin-pagamentos', label:'Formas de pagamento' },
    { id:'fin-gorjetas',   label:'Acerto de garçons' },
  ]},
  { type:'group', label:'Relacionamentos', icon:'👥', items:[
    { id:'rel-clientes', label:'Cadastro de clientes' },
    { id:'rel-cupons',   label:'Cupons de desconto' },
  ]},
  { type:'group', label:'Relatórios', icon:'📈', items:[
    { id:'rel-itens',        label:'Itens vendidos' },
    { id:'rel-faturamento',  label:'Faturamento por dia' },
    { id:'rel-tempo',        label:'Tempo por status' },
  ]},
  { type:'link',  id:'estoque', label:'Estoque', icon:'📦' },
  { type:'group', label:'Configurações', icon:'⚙️', items:[
    { id:'config-loja',          label:'Dados da loja' },
    { id:'config-horarios',      label:'Horários de funcionamento' },
    { id:'config-fiscal',        label:'Dados fiscais' },
    { id:'config-cancelamento',  label:'Motivos de cancelamento' },
    { id:'config-desconto',      label:'Motivos de desconto' },
    { id:'config-impressao',     label:'Modelos de impressão' },
  ]},
];

const PAY_LABELS: Record<string,string> = {
  CASH:'Dinheiro', CARD:'Cartão', PIX:'Pix', VOUCHER:'Voucher',
};
const PAY_COLORS: Record<string,string> = {
  CASH: BRAND.green, CARD:'#5c6bc0', PIX:'#00bfa5', VOUCHER: BRAND.orange,
};
const CAT_LABELS: Record<string,string> = {
  kitchen:'Cozinha', bar:'Bar', cashier:'Caixa',
};
const CATEGORIES = ['kitchen','bar','cashier'] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function todayStart() { const d = new Date(); d.setHours(0,0,0,0); return d; }
function getSubtotal(c: any) {
  return (c.items ?? []).reduce((s: number, i: any) => s + i.quantity * parseFloat(i.unitPrice), 0);
}
function getTotal(c: any) {
  if (c.payments?.length) return c.payments.reduce((s: number, p: any) => s + parseFloat(p.amount), 0);
  return getSubtotal(c);
}

// ─── Shared UI ────────────────────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background:'#fff', borderRadius:12, padding:'20px 24px',
      boxShadow:'0 1px 4px rgba(0,0,0,.08)', border:'1px solid #e8ecf0', ...style }}>
      {children}
    </div>
  );
}

function PageHeader({ title, subtitle, action }: { title:string; subtitle?:string; action?: React.ReactNode }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
      <div>
        <h1 style={{ margin:0, fontSize:22, fontWeight:900, color:BRAND.navy }}>{title}</h1>
        {subtitle && <p style={{ margin:'4px 0 0', color:'#888', fontSize:13 }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function EmptyPlaceholder({ icon, title, subtitle }: { icon:string; title:string; subtitle?:string }) {
  return (
    <div style={{ textAlign:'center', padding:'80px 40px' }}>
      <div style={{ fontSize:56, marginBottom:16 }}>{icon}</div>
      <h2 style={{ margin:0, fontSize:18, fontWeight:800, color:BRAND.navy }}>{title}</h2>
      {subtitle && <p style={{ margin:'8px 0 0', color:'#aaa', fontSize:13 }}>{subtitle}</p>}
    </div>
  );
}

function Btn({ children, onClick, variant='primary', small=false, disabled=false }: any) {
  const V: Record<string,any> = {
    primary:   { background:`linear-gradient(135deg,${BRAND.orange},${BRAND.red})`, color:'#fff', border:'none' },
    secondary: { background:BRAND.yellow, color:BRAND.navy, border:'none' },
    ghost:     { background:'transparent', color:BRAND.navy, border:'1.5px solid #d0d5dd' },
    danger:    { background:BRAND.red, color:'#fff', border:'none' },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...V[variant], borderRadius:8, padding: small ? '6px 14px' : '10px 20px',
      fontSize: small ? 12 : 14, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
      opacity: disabled ? .5 : 1,
    }}>{children}</button>
  );
}

function TableHead({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr style={{ background:'#f8f9fa' }}>
        {cols.map(h => (
          <th key={h} style={{ textAlign:'left', padding:'10px 16px', fontSize:11, color:'#888',
            fontWeight:700, textTransform:'uppercase', letterSpacing:.5 }}>{h}</th>
        ))}
      </tr>
    </thead>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [all, setAll]         = useState<any[]>([]);

  const load = useCallback(async () => {
    try { setAll(await comandasApi.list() as any[]); }
    catch(e) {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const start   = todayStart();
  const today   = all.filter(c => new Date(c.openedAt) >= start);
  const closed  = today.filter(c => c.status === 'CLOSED');
  const open    = today.filter(c => c.status !== 'CLOSED');
  const revenue = closed.reduce((s, c) => s + getTotal(c), 0);

  const payByMethod: Record<string,number> = {};
  for (const c of closed)
    for (const p of (c.payments ?? []))
      payByMethod[p.method] = (payByMethod[p.method] ?? 0) + parseFloat(p.amount);

  const itemMap: Record<string,{ name:string; qty:number; total:number }> = {};
  for (const c of closed)
    for (const item of (c.items ?? [])) {
      const name = item.menuItem?.name ?? item.name ?? '?';
      if (!itemMap[name]) itemMap[name] = { name, qty:0, total:0 };
      itemMap[name].qty   += item.quantity;
      itemMap[name].total += item.quantity * parseFloat(item.unitPrice);
    }
  const itemsSold = Object.values(itemMap).sort((a,b) => b.qty - a.qty);

  const totalItems = closed.reduce((s,c) => (c.items??[]).reduce((ss:number,i:any) => ss+i.quantity, 0)+s, 0);

  if (loading) return <div style={{ padding:40, color:'#888', fontSize:14 }}>Carregando...</div>;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`Hoje, ${new Date().toLocaleDateString('pt-BR',{ weekday:'long', day:'2-digit', month:'long' })}`}
        action={
          <Btn variant="ghost" small onClick={load}>↻ Atualizar</Btn>
        }
      />

      {/* KPI row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        {[
          { label:'Faturamento do Dia',   value:fmtBRL(revenue),  sub:`${closed.length} comanda(s) fechada(s)`, color:BRAND.green  },
          { label:'Ticket Médio',         value:fmtBRL(closed.length ? revenue/closed.length : 0), sub:'por comanda fechada', color:BRAND.orange },
          { label:'Comandas em Aberto',   value:String(open.length), sub:fmtBRL(open.reduce((s,c)=>s+getSubtotal(c),0))+' pendente', color:BRAND.navy },
          { label:'Itens Vendidos',       value:String(totalItems),  sub:'itens hoje', color:'#5c6bc0' },
        ].map(k => (
          <Card key={k.label}>
            <div style={{ fontSize:11, fontWeight:700, color:'#999', textTransform:'uppercase', letterSpacing:.5 }}>{k.label}</div>
            <div style={{ fontSize:26, fontWeight:900, color:k.color, margin:'6px 0 4px' }}>{k.value}</div>
            <div style={{ fontSize:11, color:'#bbb' }}>{k.sub}</div>
          </Card>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:24 }}>
        {/* Pagamentos por forma */}
        <Card>
          <h3 style={{ margin:'0 0 16px', fontSize:15, fontWeight:800, color:BRAND.navy }}>Pagamentos por Forma</h3>
          {Object.keys(payByMethod).length === 0
            ? <p style={{ color:'#ccc', fontSize:13, margin:0 }}>Nenhum pagamento registrado hoje</p>
            : <>
                {Object.entries(payByMethod).map(([method, amount]) => (
                  <div key={method} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                    padding:'10px 0', borderBottom:'1px solid #f5f5f5' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:10, height:10, borderRadius:'50%', background:PAY_COLORS[method]??'#999' }} />
                      <span style={{ fontWeight:700, fontSize:14, color:BRAND.navy }}>{PAY_LABELS[method]??method}</span>
                    </div>
                    <span style={{ fontWeight:800, fontSize:15, color:BRAND.navy }}>{fmtBRL(amount)}</span>
                  </div>
                ))}
                <div style={{ display:'flex', justifyContent:'space-between', padding:'12px 0 0' }}>
                  <span style={{ fontWeight:700, color:'#888', fontSize:12, textTransform:'uppercase' }}>Total</span>
                  <span style={{ fontWeight:900, fontSize:16, color:BRAND.green }}>{fmtBRL(revenue)}</span>
                </div>
              </>
          }
        </Card>

        {/* Itens mais vendidos */}
        <Card>
          <h3 style={{ margin:'0 0 16px', fontSize:15, fontWeight:800, color:BRAND.navy }}>Itens Mais Vendidos Hoje</h3>
          {itemsSold.length === 0
            ? <p style={{ color:'#ccc', fontSize:13, margin:0 }}>Nenhum item vendido hoje</p>
            : itemsSold.slice(0,8).map((item,idx) => (
                <div key={item.name} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                  padding:'7px 0', borderBottom:'1px solid #f5f5f5' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:11, fontWeight:800, color:'#ccc', width:18 }}>#{idx+1}</span>
                    <span style={{ fontSize:13, color:BRAND.navy, fontWeight:600 }}>{item.name}</span>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:13, fontWeight:800, color:BRAND.orange }}>{item.qty}×</div>
                    <div style={{ fontSize:11, color:'#aaa' }}>{fmtBRL(item.total)}</div>
                  </div>
                </div>
              ))
          }
        </Card>
      </div>

      {/* Histórico */}
      <Card style={{ padding:0, overflow:'hidden' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid #f0f0f0' }}>
          <h3 style={{ margin:0, fontSize:15, fontWeight:800, color:BRAND.navy }}>Histórico de Pedidos — Hoje</h3>
        </div>
        {closed.length === 0
          ? <p style={{ color:'#ccc', fontSize:13, padding:'32px 20px', margin:0 }}>Nenhum pedido fechado hoje</p>
          : <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <TableHead cols={['#','Mesa','Cliente','Abertura','Fechamento','Itens','Total','Pagamento']} />
              <tbody>
                {[...closed].reverse().map(c => (
                  <tr key={c.id} style={{ borderBottom:'1px solid #f7f7f7' }}>
                    <td style={{ padding:'10px 16px', fontWeight:700, color:BRAND.orange }}>#{c.number}</td>
                    <td style={{ padding:'10px 16px', fontWeight:600, color:BRAND.navy }}>{c.table?.label??'—'}</td>
                    <td style={{ padding:'10px 16px', color:'#666' }}>{c.customerName??'—'}</td>
                    <td style={{ padding:'10px 16px', color:'#999' }}>{fmtDate(c.openedAt)}</td>
                    <td style={{ padding:'10px 16px', color:'#999' }}>{c.closedAt ? fmtDate(c.closedAt) : '—'}</td>
                    <td style={{ padding:'10px 16px', textAlign:'center' }}>{(c.items??[]).reduce((s:number,i:any)=>s+i.quantity,0)}</td>
                    <td style={{ padding:'10px 16px', fontWeight:800, color:BRAND.green }}>{fmtBRL(getTotal(c))}</td>
                    <td style={{ padding:'10px 16px' }}>
                      {(c.payments??[]).map((p:any) => (
                        <span key={p.id} style={{ fontSize:11, fontWeight:700,
                          color:PAY_COLORS[p.method]??'#999', background:'#f5f5f5',
                          borderRadius:4, padding:'2px 6px', marginRight:4 }}>
                          {PAY_LABELS[p.method]??p.method}
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </Card>
    </div>
  );
}

// ─── Cardápio ─────────────────────────────────────────────────────────────────
function CardapioSection() {
  const [items, setItems]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm]       = useState<any>(null);
  const [catFilter, setCat]   = useState('all');
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await menuApi.list() as any[]); }
    catch(e) {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = catFilter === 'all' ? items : items.filter(i => i.category === catFilter);

  async function save() {
    if (!form.name?.trim() || !form.price) { setErr('Preencha nome e preço.'); return; }
    setSaving(true); setErr('');
    try {
      if (form.id) {
        await menuApi.update(form.id, {
          name:form.name, category:form.category,
          price:parseFloat(form.price), description:form.description, available:form.available,
        });
      } else {
        await menuApi.create({
          name:form.name, category:form.category,
          price:parseFloat(form.price), description:form.description, available:true,
        });
      }
      await load(); setForm(null);
    } catch(e:any) { setErr(e.message); }
    finally { setSaving(false); }
  }

  async function del(id: string) {
    if (!confirm('Remover este item do cardápio?')) return;
    try { await menuApi.remove(id); await load(); }
    catch(e:any) { alert(e.message); }
  }

  return (
    <div>
      <PageHeader
        title="Cardápio"
        subtitle={`${items.length} itens cadastrados`}
        action={
          <Btn onClick={() => setForm({ name:'', category:'kitchen', price:'', description:'', available:true })}>
            + Novo Item
          </Btn>
        }
      />

      {/* Category pills */}
      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        {['all',...CATEGORIES].map(cat => (
          <button key={cat} onClick={() => setCat(cat)} style={{
            padding:'6px 16px', borderRadius:20, border:'none', fontWeight:700,
            fontSize:13, cursor:'pointer',
            background: catFilter===cat ? BRAND.navy : '#ebebeb',
            color:       catFilter===cat ? '#fff' : '#555',
          }}>
            {cat === 'all' ? 'Todos' : CAT_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Modal */}
      {form && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:200,
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:16, padding:32, width:480, maxWidth:'90vw',
            boxShadow:'0 20px 60px rgba(0,0,0,.25)' }}>
            <h2 style={{ margin:'0 0 22px', fontSize:18, fontWeight:900, color:BRAND.navy }}>
              {form.id ? 'Editar Item' : 'Novo Item do Cardápio'}
            </h2>
            {[
              { label:'Nome *',       key:'name',        type:'text',   placeholder:'Ex: Ramen Shoyu' },
              { label:'Preço (R$) *', key:'price',       type:'number', placeholder:'0.00' },
              { label:'Descrição',    key:'description', type:'text',   placeholder:'Ingredientes, detalhes...' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom:14 }}>
                <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#666', marginBottom:5 }}>{f.label}</label>
                <input type={f.type} value={form[f.key]??''} placeholder={f.placeholder}
                  onChange={e => setForm({...form, [f.key]:e.target.value})}
                  style={{ width:'100%', boxSizing:'border-box', border:'1.5px solid #dde', borderRadius:8,
                    padding:'10px 12px', fontSize:14, outline:'none', fontFamily:'inherit' }}
                />
              </div>
            ))}
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#666', marginBottom:5 }}>Categoria</label>
              <select value={form.category} onChange={e => setForm({...form, category:e.target.value})}
                style={{ width:'100%', border:'1.5px solid #dde', borderRadius:8, padding:'10px 12px',
                  fontSize:14, outline:'none', fontFamily:'inherit' }}>
                {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
              </select>
            </div>
            {form.id && (
              <div style={{ marginBottom:14 }}>
                <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:14, cursor:'pointer', color:'#444' }}>
                  <input type="checkbox" checked={form.available}
                    onChange={e => setForm({...form, available:e.target.checked})} />
                  Disponível no cardápio
                </label>
              </div>
            )}
            {err && <p style={{ color:BRAND.red, fontSize:13, margin:'0 0 12px' }}>{err}</p>}
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:4 }}>
              <Btn variant="ghost" onClick={() => { setForm(null); setErr(''); }}>Cancelar</Btn>
              <Btn onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Btn>
            </div>
          </div>
        </div>
      )}

      {loading
        ? <p style={{ color:'#aaa', fontSize:13 }}>Carregando...</p>
        : <Card style={{ padding:0, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <TableHead cols={['Nome','Categoria','Preço','Status','Ações']} />
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={5} style={{ padding:'40px', textAlign:'center', color:'#ccc' }}>
                    Nenhum item encontrado
                  </td></tr>
                )}
                {filtered.map(item => (
                  <tr key={item.id} style={{ borderBottom:'1px solid #f5f5f5' }}>
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ fontWeight:700, color:BRAND.navy }}>{item.name}</div>
                      {item.description && <div style={{ fontSize:11, color:'#aaa', marginTop:2 }}>{item.description}</div>}
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ background:'#f0f2f5', borderRadius:4, padding:'3px 10px',
                        fontSize:11, fontWeight:700, color:'#555' }}>
                        {CAT_LABELS[item.category]??item.category}
                      </span>
                    </td>
                    <td style={{ padding:'12px 16px', fontWeight:800, color:BRAND.green }}>{fmtBRL(item.price)}</td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ fontSize:11, fontWeight:700,
                        color:item.available ? BRAND.green : '#aaa',
                        background:item.available ? '#e8f8ee' : '#f5f5f5',
                        borderRadius:4, padding:'3px 10px' }}>
                        {item.available ? 'Disponível' : 'Indisponível'}
                      </span>
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ display:'flex', gap:6 }}>
                        <Btn small variant="ghost"
                          onClick={() => setForm({...item, price:String(item.price)})}>
                          Editar
                        </Btn>
                        <Btn small variant="danger" onClick={() => del(item.id)}>Excluir</Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
      }
    </div>
  );
}

// ─── Financeiro ───────────────────────────────────────────────────────────────
function FormasPagamento() {
  const methods = [
    { id:'CASH', label:'Dinheiro', desc:'Aceite pagamentos em espécie' },
    { id:'CARD', label:'Cartão (débito/crédito)', desc:'Via maquininha' },
    { id:'PIX',  label:'Pix', desc:'Transferência instantânea' },
    { id:'VOUCHER', label:'Voucher', desc:'Vale-refeição e alimentação' },
  ];
  return (
    <div>
      <PageHeader title="Formas de Pagamento" subtitle="Métodos aceitos no estabelecimento" />
      <Card style={{ maxWidth:520 }}>
        {methods.map((m, i) => (
          <div key={m.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
            padding:'14px 0', borderBottom: i < methods.length-1 ? '1px solid #f5f5f5' : 'none' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:10, height:10, borderRadius:'50%', background:PAY_COLORS[m.id]??'#999', flexShrink:0 }} />
              <div>
                <div style={{ fontWeight:700, fontSize:14, color:BRAND.navy }}>{m.label}</div>
                <div style={{ fontSize:12, color:'#aaa' }}>{m.desc}</div>
              </div>
            </div>
            <span style={{ fontSize:12, fontWeight:700, color:BRAND.green,
              background:'#e8f8ee', borderRadius:4, padding:'3px 10px' }}>Ativo</span>
          </div>
        ))}
        <p style={{ color:'#ccc', fontSize:12, margin:'16px 0 0' }}>
          Gerenciamento de formas de pagamento disponível em breve.
        </p>
      </Card>
    </div>
  );
}

function AcertoGarcons() {
  const [loading, setLoading] = useState(true);
  const [data, setData]       = useState<any[]>([]);

  useEffect(() => {
    comandasApi.list()
      .then((all: any) => {
        const start = todayStart();
        setData((all as any[]).filter(c =>
          c.status === 'CLOSED' && new Date(c.openedAt) >= start &&
          (c.surchargeType || parseFloat(c.surchargeValue) > 0)));
      })
      .catch(()=>{})
      .finally(()=>setLoading(false));
  }, []);

  const totalGorjeta = data.reduce((s, c) => {
    const sub = getSubtotal(c);
    const v = parseFloat(c.surchargeValue) || 0;
    return s + (c.surchargeType === 'percent' ? sub * v / 100 : v);
  }, 0);

  return (
    <div>
      <PageHeader title="Acerto de Garçons" subtitle="Gorjetas compulsórias registradas hoje" />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:24 }}>
        <Card>
          <div style={{ fontSize:11, color:'#999', fontWeight:700, textTransform:'uppercase' }}>Total de Gorjetas</div>
          <div style={{ fontSize:26, fontWeight:900, color:BRAND.green, marginTop:6 }}>{fmtBRL(totalGorjeta)}</div>
        </Card>
        <Card>
          <div style={{ fontSize:11, color:'#999', fontWeight:700, textTransform:'uppercase' }}>Comandas com Gorjeta</div>
          <div style={{ fontSize:26, fontWeight:900, color:BRAND.navy, marginTop:6 }}>{data.length}</div>
        </Card>
        <Card>
          <div style={{ fontSize:11, color:'#999', fontWeight:700, textTransform:'uppercase' }}>Média por Comanda</div>
          <div style={{ fontSize:26, fontWeight:900, color:BRAND.orange, marginTop:6 }}>
            {fmtBRL(data.length ? totalGorjeta / data.length : 0)}
          </div>
        </Card>
      </div>
      {loading ? <p style={{ color:'#aaa', fontSize:13 }}>Carregando...</p> : (
        <Card style={{ padding:0 }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <TableHead cols={['#','Mesa','Subtotal','Gorjeta','Total Pago']} />
            <tbody>
              {data.length === 0 && (
                <tr><td colSpan={5} style={{ padding:'40px', textAlign:'center', color:'#ccc' }}>
                  Nenhuma gorjeta registrada hoje
                </td></tr>
              )}
              {data.map(c => {
                const sub  = getSubtotal(c);
                const v    = parseFloat(c.surchargeValue) || 0;
                const gorj = c.surchargeType === 'percent' ? sub * v / 100 : v;
                return (
                  <tr key={c.id} style={{ borderBottom:'1px solid #f0f0f0' }}>
                    <td style={{ padding:'10px 16px', fontWeight:700, color:BRAND.orange }}>#{c.number}</td>
                    <td style={{ padding:'10px 16px', fontWeight:600, color:BRAND.navy }}>{c.table?.label??'—'}</td>
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

// ─── Relatórios ───────────────────────────────────────────────────────────────
function RelItensVendidos() {
  const [loading, setLoading] = useState(true);
  const [items, setItems]     = useState<{ name:string; qty:number; total:number; category:string }[]>([]);
  const [period, setPeriod]   = useState('today');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const all: any[] = await comandasApi.list() as any[];
      const now = new Date();
      let from: Date;
      if (period === 'today')  { from = new Date(now); from.setHours(0,0,0,0); }
      else if (period === 'week')  { from = new Date(now); from.setDate(from.getDate()-7); }
      else { from = new Date(now); from.setDate(1); from.setHours(0,0,0,0); }

      const closed = all.filter(c => c.status==='CLOSED' && new Date(c.openedAt) >= from);
      const map: Record<string,any> = {};
      for (const c of closed)
        for (const item of (c.items??[])) {
          const name = item.menuItem?.name ?? item.name ?? '?';
          const cat  = item.menuItem?.category ?? item.category ?? '?';
          if (!map[name]) map[name] = { name, qty:0, total:0, category:cat };
          map[name].qty   += item.quantity;
          map[name].total += item.quantity * parseFloat(item.unitPrice);
        }
      setItems(Object.values(map).sort((a,b)=>b.qty-a.qty));
      setLoading(false);
    })();
  }, [period]);

  return (
    <div>
      <PageHeader
        title="Itens Vendidos"
        subtitle="Ranking de itens do cardápio"
        action={
          <select value={period} onChange={e=>setPeriod(e.target.value)}
            style={{ border:'1.5px solid #ddd', borderRadius:8, padding:'8px 12px', fontSize:13,
              fontWeight:600, cursor:'pointer', outline:'none' }}>
            <option value="today">Hoje</option>
            <option value="week">Últimos 7 dias</option>
            <option value="month">Este mês</option>
          </select>
        }
      />
      {loading ? <p style={{ color:'#aaa', fontSize:13 }}>Carregando...</p> : (
        <Card style={{ padding:0 }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <TableHead cols={['#','Item','Categoria','Qtd. Vendida','Receita Total']} />
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={5} style={{ padding:'40px', textAlign:'center', color:'#ccc' }}>
                  Nenhum item vendido no período
                </td></tr>
              )}
              {items.map((item, idx) => (
                <tr key={item.name} style={{ borderBottom:'1px solid #f0f0f0' }}>
                  <td style={{ padding:'10px 16px', color:'#ccc', fontWeight:700 }}>#{idx+1}</td>
                  <td style={{ padding:'10px 16px', fontWeight:700, color:BRAND.navy }}>{item.name}</td>
                  <td style={{ padding:'10px 16px' }}>
                    <span style={{ background:'#f0f2f5', borderRadius:4, padding:'2px 8px', fontSize:11, fontWeight:700 }}>
                      {CAT_LABELS[item.category]??item.category}
                    </span>
                  </td>
                  <td style={{ padding:'10px 16px', fontWeight:900, fontSize:16, color:BRAND.orange }}>{item.qty}</td>
                  <td style={{ padding:'10px 16px', fontWeight:800, color:BRAND.green }}>{fmtBRL(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function RelFaturamento() {
  const [loading, setLoading] = useState(true);
  const [byDay, setByDay]     = useState<{ date:string; count:number; total:number }[]>([]);

  useEffect(() => {
    (async () => {
      const all: any[] = await comandasApi.list() as any[];
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

function RelTempoStatus() {
  const [loading, setLoading] = useState(true);
  const [data, setData]       = useState<{ number:number; table:string; open:string; closed:string; min:number }[]>([]);

  useEffect(() => {
    (async () => {
      const all: any[] = await comandasApi.list() as any[];
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

// ─── Motivos de Cancelamento ────────────────────────────────────────────────────
function MotivosCancelamento() {
  const [reasons, setReasons] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm]       = useState<{ label:string } | null>(null);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, h] = await Promise.all([reasonsApi.cancellation.list(), reasonsApi.cancellation.history()]);
      setReasons(r as unknown as any[]); setHistory(h as unknown as any[]);
    } catch(e) {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!form?.label.trim()) { setErr('Informe um nome para o motivo.'); return; }
    setSaving(true); setErr('');
    try { await reasonsApi.cancellation.create({ label: form.label.trim() }); await load(); setForm(null); }
    catch(e:any) { setErr(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <PageHeader
        title="Motivos de Cancelamento"
        subtitle="Motivos usados ao remover itens de uma comanda no caixa"
        action={<Btn onClick={() => setForm({ label:'' })}>+ Novo Motivo</Btn>}
      />

      {form && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:200,
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:16, padding:32, width:420, maxWidth:'90vw',
            boxShadow:'0 20px 60px rgba(0,0,0,.25)' }}>
            <h2 style={{ margin:'0 0 20px', fontSize:18, fontWeight:900, color:BRAND.navy }}>Novo Motivo de Cancelamento</h2>
            <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#666', marginBottom:5 }}>Nome do motivo</label>
            <input value={form.label} onChange={e => setForm({ label:e.target.value })} placeholder="Ex: Item errado"
              style={{ width:'100%', boxSizing:'border-box', border:'1.5px solid #dde', borderRadius:8,
                padding:'10px 12px', fontSize:14, outline:'none', fontFamily:'inherit' }} />
            {err && <p style={{ color:BRAND.red, fontSize:13, margin:'12px 0 0' }}>{err}</p>}
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
              <Btn variant="ghost" onClick={() => { setForm(null); setErr(''); }}>Cancelar</Btn>
              <Btn onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Btn>
            </div>
          </div>
        </div>
      )}

      {loading ? <p style={{ color:'#aaa', fontSize:13 }}>Carregando...</p> : (
        <>
          <Card style={{ padding:0, overflow:'hidden', marginBottom:24 }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <TableHead cols={['Motivo','Vezes Utilizado']} />
              <tbody>
                {reasons.length === 0 && (
                  <tr><td colSpan={2} style={{ padding:'40px', textAlign:'center', color:'#ccc' }}>
                    Nenhum motivo cadastrado
                  </td></tr>
                )}
                {reasons.map((r:any) => (
                  <tr key={r.id} style={{ borderBottom:'1px solid #f5f5f5' }}>
                    <td style={{ padding:'12px 16px', fontWeight:700, color:BRAND.navy }}>{r.label}</td>
                    <td style={{ padding:'12px 16px', fontWeight:800, color:BRAND.orange }}>{r.usageCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card style={{ padding:0, overflow:'hidden' }}>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid #f0f0f0' }}>
              <h3 style={{ margin:0, fontSize:15, fontWeight:800, color:BRAND.navy }}>Histórico de Cancelamentos</h3>
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <TableHead cols={['Data','Item','Qtd.','Valor','Motivo']} />
              <tbody>
                {history.length === 0 && (
                  <tr><td colSpan={5} style={{ padding:'40px', textAlign:'center', color:'#ccc' }}>
                    Nenhum cancelamento registrado
                  </td></tr>
                )}
                {history.map((h:any) => (
                  <tr key={h.id} style={{ borderBottom:'1px solid #f0f0f0' }}>
                    <td style={{ padding:'10px 16px', color:'#999' }}>{fmtDate(h.createdAt)}</td>
                    <td style={{ padding:'10px 16px', fontWeight:600, color:BRAND.navy }}>{h.itemName}</td>
                    <td style={{ padding:'10px 16px', textAlign:'center' }}>{h.quantity}</td>
                    <td style={{ padding:'10px 16px', fontWeight:700, color:BRAND.red }}>{fmtBRL(h.amount)}</td>
                    <td style={{ padding:'10px 16px' }}>
                      <span style={{ background:'#f0f2f5', borderRadius:4, padding:'3px 10px',
                        fontSize:11, fontWeight:700, color:'#555' }}>
                        {h.reason?.label ?? '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}

// ─── Motivos de Desconto ────────────────────────────────────────────────────────
function MotivosDesconto() {
  const [reasons, setReasons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm]       = useState<{ label:string; type:'percent'|'fixed'; value:string } | null>(null);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setReasons(await reasonsApi.discount.list() as unknown as any[]); }
    catch(e) {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!form) return;
    if (!form.label.trim()) { setErr('Informe um nome para o motivo.'); return; }
    if (!form.value || parseFloat(form.value) <= 0) { setErr('Informe um valor válido.'); return; }
    setSaving(true); setErr('');
    try {
      await reasonsApi.discount.create({ label: form.label.trim(), type: form.type, value: parseFloat(form.value) });
      await load(); setForm(null);
    } catch(e:any) { setErr(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <PageHeader
        title="Motivos de Desconto"
        subtitle="Descontos pré-definidos aplicáveis no fechamento da conta"
        action={<Btn onClick={() => setForm({ label:'', type:'percent', value:'' })}>+ Novo Motivo</Btn>}
      />

      {form && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:200,
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:16, padding:32, width:420, maxWidth:'90vw',
            boxShadow:'0 20px 60px rgba(0,0,0,.25)' }}>
            <h2 style={{ margin:'0 0 20px', fontSize:18, fontWeight:900, color:BRAND.navy }}>Novo Motivo de Desconto</h2>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#666', marginBottom:5 }}>Nome do motivo</label>
              <input value={form.label} onChange={e => setForm({ ...form, label:e.target.value })} placeholder="Ex: Cliente fidelidade"
                style={{ width:'100%', boxSizing:'border-box', border:'1.5px solid #dde', borderRadius:8,
                  padding:'10px 12px', fontSize:14, outline:'none', fontFamily:'inherit' }} />
            </div>
            <div style={{ display:'flex', gap:10, marginBottom:14 }}>
              <div style={{ flex:1 }}>
                <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#666', marginBottom:5 }}>Tipo</label>
                <select value={form.type} onChange={e => setForm({ ...form, type:e.target.value as 'percent'|'fixed' })}
                  style={{ width:'100%', border:'1.5px solid #dde', borderRadius:8, padding:'10px 12px',
                    fontSize:14, outline:'none', fontFamily:'inherit' }}>
                  <option value="percent">Porcentagem (%)</option>
                  <option value="fixed">Valor fixo (R$)</option>
                </select>
              </div>
              <div style={{ flex:1 }}>
                <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#666', marginBottom:5 }}>Valor</label>
                <input type="number" min="0" step="0.01" value={form.value} onChange={e => setForm({ ...form, value:e.target.value })}
                  placeholder={form.type === 'percent' ? '10' : '5.00'}
                  style={{ width:'100%', boxSizing:'border-box', border:'1.5px solid #dde', borderRadius:8,
                    padding:'10px 12px', fontSize:14, outline:'none', fontFamily:'inherit' }} />
              </div>
            </div>
            {err && <p style={{ color:BRAND.red, fontSize:13, margin:'0 0 12px' }}>{err}</p>}
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <Btn variant="ghost" onClick={() => { setForm(null); setErr(''); }}>Cancelar</Btn>
              <Btn onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Btn>
            </div>
          </div>
        </div>
      )}

      {loading ? <p style={{ color:'#aaa', fontSize:13 }}>Carregando...</p> : (
        <Card style={{ padding:0, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <TableHead cols={['Motivo','Desconto Pré-definido']} />
            <tbody>
              {reasons.length === 0 && (
                <tr><td colSpan={2} style={{ padding:'40px', textAlign:'center', color:'#ccc' }}>
                  Nenhum motivo cadastrado
                </td></tr>
              )}
              {reasons.map((r:any) => (
                <tr key={r.id} style={{ borderBottom:'1px solid #f5f5f5' }}>
                  <td style={{ padding:'12px 16px', fontWeight:700, color:BRAND.navy }}>{r.label}</td>
                  <td style={{ padding:'12px 16px' }}>
                    <span style={{ fontWeight:800, color:BRAND.green }}>
                      {r.type === 'percent' ? `${r.value}%` : fmtBRL(r.value)}
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

// ─── Modelos de Impressão ─────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked:boolean; onChange:(v:boolean)=>void }) {
  return (
    <button onClick={() => onChange(!checked)} style={{
      width:40, height:22, borderRadius:999, border:'none', cursor:'pointer', position:'relative',
      background: checked ? BRAND.green : '#ccc', transition:'background .15s', padding:0, flexShrink:0,
    }}>
      <span style={{
        position:'absolute', top:2, left: checked ? 20 : 2, width:18, height:18, borderRadius:'50%',
        background:'#fff', transition:'left .15s', boxShadow:'0 1px 3px rgba(0,0,0,.3)',
      }} />
    </button>
  );
}

const PRINT_TABS = [
  { id:'kitchen', label:'Cozinha' },
  { id:'bar',     label:'Bar' },
  { id:'receipt', label:'Fechamento de Conta' },
  { id:'fiscal',  label:'Cupom Fiscal' },
] as const;
type PrintTabId = typeof PRINT_TABS[number]['id'];

function TemplateFields({ type, config, onChange }: { type:PrintTabId; config:any; onChange:(k:string,v:any)=>void }) {
  const textField = (key:string, label:string, placeholder?:string) => (
    <div style={{ marginBottom:14 }} key={key}>
      <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#666', marginBottom:5 }}>{label}</label>
      <input value={config[key] ?? ''} placeholder={placeholder} onChange={e => onChange(key, e.target.value)}
        style={{ width:'100%', boxSizing:'border-box', border:'1.5px solid #dde', borderRadius:8,
          padding:'10px 12px', fontSize:14, outline:'none', fontFamily:'inherit' }} />
    </div>
  );
  const checkField = (key:string, label:string) => (
    <label key={key} style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'#444', cursor:'pointer', marginBottom:10 }}>
      <input type="checkbox" checked={!!config[key]} onChange={e => onChange(key, e.target.checked)} />
      {label}
    </label>
  );
  const cutField = (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#666', marginBottom:5 }}>Corte do papel</label>
      <select value={config.cutMode} onChange={e => onChange('cutMode', e.target.value)}
        style={{ width:'100%', border:'1.5px solid #dde', borderRadius:8, padding:'10px 12px',
          fontSize:14, outline:'none', fontFamily:'inherit' }}>
        <option value="partial">Corte parcial</option>
        <option value="full">Corte total</option>
      </select>
    </div>
  );

  if (type === 'kitchen' || type === 'bar') {
    return (
      <>
        <div style={{ marginBottom:16 }}>
          {checkField('showComanda', 'Mostrar número da comanda')}
          {checkField('showCliente', 'Mostrar nome do cliente')}
          {checkField('showGarcom', 'Mostrar garçom responsável')}
          {checkField('showObservacoes', 'Mostrar observações do item')}
        </div>
        {textField('footerText', 'Mensagem no rodapé', 'Ex: Confirmar antes de sair')}
        {cutField}
      </>
    );
  }

  if (type === 'receipt') {
    return (
      <>
        {textField('storeName', 'Nome da loja (cabeçalho)', 'BODOGAMI')}
        {textField('headerText', 'Linha adicional do cabeçalho', 'Ex: Restaurante Japonês')}
        <div style={{ marginBottom:16 }}>
          {checkField('showEndereco', 'Mostrar endereço')}
        </div>
        {config.showEndereco && textField('endereco', 'Endereço', 'Rua Exemplo, 123')}
        <div style={{ marginBottom:16 }}>
          {checkField('showTaxaServico', 'Mostrar taxa de serviço / gorjeta')}
          {checkField('showDesconto', 'Mostrar desconto')}
          {checkField('showAssinatura', 'Mostrar linha de assinatura (venda fiado)')}
        </div>
        {textField('footerText', 'Mensagem no rodapé', 'Obrigado pela visita!')}
        {cutField}
      </>
    );
  }

  // fiscal
  return (
    <>
      {textField('razaoSocial', 'Razão social', 'Bodogami Ltda')}
      {textField('cnpj', 'CNPJ', '00.000.000/0001-00')}
      {textField('endereco', 'Endereço', 'Rua Exemplo, 123')}
      {textField('footerText', 'Mensagem no rodapé', 'Documento sem valor fiscal')}
      {cutField}
      <p style={{ fontSize:12, color:'#aaa', marginTop:8 }}>
        Este cupom é apenas um modelo de impressão — não substitui a emissão fiscal real (SAT/NFC-e).
      </p>
    </>
  );
}

function TicketPreview({ type, config }: { type:PrintTabId; config:any }) {
  const sample = {
    number: 42, table: 'Mesa 5', customer: 'Cliente Teste', garcom: 'Garçom Teste',
    now: new Date().toLocaleString('pt-BR', { timeZone:'America/Sao_Paulo' }),
    items: [
      { qty:2, name:'Ramen Shoyu',   notes:'sem cebola', price:20 },
      { qty:1, name:'Cerveja Asahi', notes:'',            price:16 },
    ],
  };
  const subtotal  = sample.items.reduce((s,i) => s + i.qty*i.price, 0);
  const taxa      = config.showTaxaServico ? subtotal*0.10 : 0;
  const desconto  = config.showDesconto ? 2 : 0;
  const total     = subtotal + taxa - desconto;
  const mono: React.CSSProperties = { fontFamily:'"Courier New",monospace', fontSize:12, lineHeight:1.6, color:'#3a3a1a' };
  const row = (l:string, r:string, bold=false) => (
    <div style={{ ...mono, display:'flex', justifyContent:'space-between', fontWeight: bold ? 700 : 400 }}><span>{l}</span><span>{r}</span></div>
  );

  return (
    <div style={{ background:'#fdf6d8', border:'1px solid #e5d98a', borderRadius:4, padding:'16px 14px',
      boxShadow:'0 2px 10px rgba(0,0,0,.08)', position:'sticky', top:20 }}>
      <div style={{ ...mono, textAlign:'center', fontWeight:700, letterSpacing:2 }}>
        {type === 'fiscal' ? (config.razaoSocial || 'BODOGAMI') : (config.storeName || 'BODOGAMI')}
      </div>
      {type === 'receipt' && config.headerText && <div style={{ ...mono, textAlign:'center' }}>{config.headerText}</div>}
      {type === 'receipt' && config.showEndereco && config.endereco && <div style={{ ...mono, textAlign:'center', fontSize:11 }}>{config.endereco}</div>}
      {type === 'fiscal' && <div style={{ ...mono, textAlign:'center', fontSize:11 }}>CNPJ: {config.cnpj}</div>}
      {type === 'fiscal' && config.endereco && <div style={{ ...mono, textAlign:'center', fontSize:11 }}>{config.endereco}</div>}
      <div style={{ ...mono, textAlign:'center', margin:'4px 0' }}>{'='.repeat(30)}</div>

      {(type === 'kitchen' || type === 'bar') && (
        <>
          <div style={{ ...mono, textAlign:'center', fontWeight:700 }}>{type === 'kitchen' ? 'COZINHA' : 'BAR'}</div>
          <div style={mono}>{'='.repeat(30)}</div>
          <div style={{ ...mono, fontWeight:700 }}>Mesa: {sample.table}</div>
          {config.showCliente && <div style={mono}>Cliente: {sample.customer}</div>}
          {config.showComanda && <div style={mono}>Comanda: #{sample.number}</div>}
          {config.showGarcom && <div style={mono}>Garçom: {sample.garcom}</div>}
          <div style={mono}>{sample.now}</div>
          <div style={mono}>{'-'.repeat(30)}</div>
          {sample.items.map((it,i) => (
            <div key={i}>
              <div style={{ ...mono, fontWeight:700 }}>{it.qty}x  {it.name}</div>
              {config.showObservacoes && it.notes && <div style={{ ...mono, paddingLeft:16 }}>&gt;&gt; {it.notes}</div>}
            </div>
          ))}
          <div style={mono}>{'='.repeat(30)}</div>
          {config.footerText && <div style={{ ...mono, textAlign:'center' }}>{config.footerText}</div>}
        </>
      )}

      {type === 'receipt' && (
        <>
          <div style={{ ...mono, textAlign:'center', fontWeight:700 }}>RECIBO</div>
          <div style={mono}>{'='.repeat(30)}</div>
          <div style={mono}>Mesa: {sample.table}</div>
          <div style={mono}>Cliente: {sample.customer}</div>
          <div style={mono}>Comanda: #{sample.number}</div>
          <div style={mono}>{'-'.repeat(30)}</div>
          {sample.items.map((it,i) => row(`${it.qty}x ${it.name}`, fmtBRL(it.qty*it.price)))}
          <div style={mono}>{'-'.repeat(30)}</div>
          {row('Subtotal', fmtBRL(subtotal))}
          {config.showTaxaServico && row('Taxa de serviço', fmtBRL(taxa))}
          {config.showDesconto && row('Desconto', `-${fmtBRL(desconto)}`)}
          <div style={mono}>{'='.repeat(30)}</div>
          {row('TOTAL', fmtBRL(total), true)}
          <div style={mono}>{'-'.repeat(30)}</div>
          {row('DINHEIRO', fmtBRL(total))}
          {config.showAssinatura && (
            <>
              <div style={mono}>{'-'.repeat(30)}</div>
              <div style={{ ...mono, textAlign:'center', marginTop:16 }}>{'_'.repeat(28)}</div>
              <div style={{ ...mono, textAlign:'center' }}>Assinatura cliente</div>
            </>
          )}
          <div style={mono}>{'='.repeat(30)}</div>
          {config.footerText && <div style={{ ...mono, textAlign:'center' }}>{config.footerText}</div>}
        </>
      )}

      {type === 'fiscal' && (
        <>
          <div style={{ ...mono, textAlign:'center', fontWeight:700 }}>CUPOM FISCAL</div>
          <div style={mono}>{'='.repeat(30)}</div>
          <div style={mono}>Comanda: #{sample.number}   {sample.now}</div>
          <div style={mono}>{'-'.repeat(30)}</div>
          {row('TOTAL', fmtBRL(total), true)}
          <div style={mono}>{'-'.repeat(30)}</div>
          {config.footerText && <div style={{ ...mono, textAlign:'center', fontSize:11 }}>{config.footerText}</div>}
        </>
      )}

      <div style={{ textAlign:'center', marginTop:14 }}>
        <div style={{ display:'inline-flex', gap:1 }}>
          {Array.from({ length:30 }).map((_,i) => (
            <div key={i} style={{ width: i % 3 === 0 ? 2 : 1, height:36, background:'#3a3a1a' }} />
          ))}
        </div>
        <div style={{ ...mono, fontSize:10, marginTop:2 }}>{String(sample.number).padStart(10,'0')}</div>
      </div>
    </div>
  );
}

function ModelosImpressao() {
  const [activeType, setActiveType] = useState<PrintTabId>('kitchen');
  const [templates, setTemplates]   = useState<Record<string, any>>({});
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [testing, setTesting]       = useState(false);
  const [msg, setMsg]               = useState('');
  const [err, setErr]               = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await printTemplatesApi.list() as unknown as any[];
      const map: Record<string, any> = {};
      list.forEach(t => { map[t.type] = t; });
      setTemplates(map);
    } catch(e) {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const current = templates[activeType];

  function updateConfig(key: string, value: any) {
    setTemplates(t => ({ ...t, [activeType]: { ...t[activeType], config: { ...t[activeType].config, [key]: value } } }));
  }
  function updateEnabled(value: boolean) {
    setTemplates(t => ({ ...t, [activeType]: { ...t[activeType], enabled: value } }));
  }

  async function save() {
    setSaving(true); setErr(''); setMsg('');
    try {
      await printTemplatesApi.update(activeType, { enabled: current.enabled, config: current.config });
      setMsg('✓ Modelo salvo com sucesso!');
      setTimeout(() => setMsg(''), 2500);
    } catch(e:any) { setErr(e.message); }
    finally { setSaving(false); }
  }

  async function restoreDefault() {
    if (!confirm('Restaurar o modelo padrão? Isso vai descartar as personalizações.')) return;
    setSaving(true); setErr('');
    try {
      const t = await printTemplatesApi.reset(activeType);
      setTemplates(prev => ({ ...prev, [activeType]: t }));
    } catch(e:any) { setErr(e.message); }
    finally { setSaving(false); }
  }

  async function testPrint() {
    setTesting(true); setErr(''); setMsg('');
    try {
      const res = await printTemplatesApi.test(activeType, { enabled: current.enabled, config: current.config }) as unknown as any;
      if (res.ok) { setMsg('✓ Teste enviado para a impressora!'); setTimeout(() => setMsg(''), 2500); }
      else setErr(res.error || 'Falha ao imprimir teste');
    } catch(e:any) { setErr(e.message); }
    finally { setTesting(false); }
  }

  if (loading || !current) return <p style={{ color:'#aaa', fontSize:13 }}>Carregando...</p>;

  return (
    <div>
      <PageHeader title="Modelos de Impressão" subtitle="Personalize o que é impresso nas impressoras térmicas" />

      <div style={{ display:'flex', gap:8, marginBottom:20, borderBottom:'1px solid #e8ecf0' }}>
        {PRINT_TABS.map(t => (
          <button key={t.id} onClick={() => setActiveType(t.id)} style={{
            padding:'10px 18px', border:'none', background:'none', cursor:'pointer',
            fontWeight:700, fontSize:13, borderBottom: activeType === t.id ? `2px solid ${BRAND.orange}` : '2px solid transparent',
            color: activeType === t.id ? BRAND.navy : '#999',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:24, alignItems:'start' }}>
        <Card>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
            <div style={{ fontWeight:800, fontSize:15, color:BRAND.navy }}>{current.label}</div>
            <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, fontWeight:700, color:'#666', cursor:'pointer' }}>
              Imprimir usando este modelo
              <Toggle checked={current.enabled} onChange={updateEnabled} />
            </label>
          </div>

          <TemplateFields type={activeType} config={current.config} onChange={updateConfig} />

          {err && <p style={{ color:BRAND.red, fontSize:13, margin:'16px 0 0' }}>{err}</p>}
          {msg && <p style={{ color:BRAND.green, fontSize:13, fontWeight:700, margin:'16px 0 0' }}>{msg}</p>}

          <div style={{ display:'flex', gap:10, marginTop:24, flexWrap:'wrap' }}>
            <Btn variant="ghost" onClick={restoreDefault} disabled={saving}>↺ Restaurar Padrão</Btn>
            <Btn variant="secondary" onClick={testPrint} disabled={testing}>{testing ? 'Enviando...' : '🖨 Imprimir Teste'}</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? 'Salvando...' : '💾 Salvar'}</Btn>
          </div>
        </Card>

        <TicketPreview type={activeType} config={current.config} />
      </div>
    </div>
  );
}

// ─── Configurações ────────────────────────────────────────────────────────────
function ConfigLoja() {
  const [cfg, setCfg]     = useState<Record<string,string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved,  setSaved]    = useState(false);
  const [err,    setErr]      = useState('');

  useEffect(() => {
    http.get('/config')
      .then((data:any) => {
        const map: Record<string,string> = {};
        if (Array.isArray(data)) data.forEach((d:any) => { map[d.key] = String(d.value??''); });
        setCfg(map);
      })
      .catch(()=>{
        // API não existe ainda — preenche com defaults
        setCfg({
          restaurant_name: 'Bodogami',
          restaurant_cnpj: '',
          receipt_footer:  'Obrigado pela visita! @bodogami',
        });
      })
      .finally(()=>setLoading(false));
  }, []);

  async function save() {
    setSaving(true); setErr('');
    try {
      await Promise.all(
        Object.entries(cfg).map(([key, value]) => http.put(`/config/${key}`, { value }))
      );
      setSaved(true); setTimeout(()=>setSaved(false), 2500);
    } catch(e:any) { setErr('Erro ao salvar: ' + e.message); }
    finally { setSaving(false); }
  }

  const FIELDS = [
    { key:'restaurant_name', label:'Nome do Restaurante', placeholder:'Bodogami' },
    { key:'restaurant_cnpj', label:'CNPJ', placeholder:'00.000.000/0001-00' },
    { key:'receipt_footer',  label:'Rodapé do Recibo', placeholder:'Obrigado pela visita!' },
  ];

  if (loading) return <p style={{ color:'#aaa', fontSize:13 }}>Carregando...</p>;

  return (
    <div>
      <PageHeader title="Dados da Loja" />
      <Card style={{ maxWidth:540 }}>
        {FIELDS.map(f => (
          <div key={f.key} style={{ marginBottom:16 }}>
            <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#666', marginBottom:5 }}>{f.label}</label>
            <input value={cfg[f.key]??''} placeholder={f.placeholder}
              onChange={e => setCfg({...cfg, [f.key]:e.target.value})}
              style={{ width:'100%', boxSizing:'border-box', border:'1.5px solid #dde',
                borderRadius:8, padding:'10px 12px', fontSize:14, outline:'none', fontFamily:'inherit' }}
            />
          </div>
        ))}
        {err && <p style={{ color:BRAND.red, fontSize:13, margin:'0 0 12px' }}>{err}</p>}
        <div style={{ display:'flex', gap:12, alignItems:'center', marginTop:8 }}>
          <Btn onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar Configurações'}</Btn>
          {saved && <span style={{ color:BRAND.green, fontWeight:700, fontSize:13 }}>✓ Salvo com sucesso!</span>}
        </div>
      </Card>
    </div>
  );
}

// ─── Renderização de seções ───────────────────────────────────────────────────
function renderSection(id: SectionId) {
  switch(id) {
    case 'dashboard':           return <Dashboard />;
    case 'cardapio':            return <CardapioSection />;
    case 'fin-pagamentos':      return <FormasPagamento />;
    case 'fin-gorjetas':        return <AcertoGarcons />;
    case 'rel-clientes':        return <EmptyPlaceholder icon="👤" title="Cadastro de Clientes" subtitle="Módulo em desenvolvimento" />;
    case 'rel-cupons':          return <EmptyPlaceholder icon="🎟️" title="Cupons de Desconto" subtitle="Módulo em desenvolvimento" />;
    case 'rel-itens':           return <RelItensVendidos />;
    case 'rel-faturamento':     return <RelFaturamento />;
    case 'rel-tempo':           return <RelTempoStatus />;
    case 'estoque':             return <EmptyPlaceholder icon="📦" title="Estoque" subtitle="Fichas técnicas e controle de insumos — em breve" />;
    case 'config-loja':         return <ConfigLoja />;
    case 'config-horarios':     return <EmptyPlaceholder icon="🕐" title="Horários de Funcionamento" subtitle="Módulo em desenvolvimento" />;
    case 'config-fiscal':       return <EmptyPlaceholder icon="📄" title="Dados Fiscais" subtitle="Módulo em desenvolvimento" />;
    case 'config-cancelamento': return <MotivosCancelamento />;
    case 'config-desconto':     return <MotivosDesconto />;
    case 'config-impressao':    return <ModelosImpressao />;
    default:                    return <Dashboard />;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Admin() {
  const [section, setSection]     = useState<SectionId>('dashboard');
  const [openGroups, setOpenGroups] = useState<Record<string,boolean>>({
    'Cardápio': false, 'Financeiro': false, 'Relacionamentos': false,
    'Relatórios': false, 'Configurações': false,
  });

  function toggle(label: string) {
    setOpenGroups(g => ({ ...g, [label]: !g[label] }));
  }

  function go(id: SectionId, groupLabel?: string) {
    setSection(id);
    if (groupLabel) setOpenGroups(g => ({ ...g, [groupLabel]: true }));
  }

  return (
    <div style={{ display:'flex', minHeight:'100vh', fontFamily:'system-ui,-apple-system,sans-serif', background:BRAND.gray }}>

      {/* ── Sidebar ── */}
      <aside style={{ width:240, background:BRAND.navy, flexShrink:0, display:'flex',
        flexDirection:'column', position:'sticky', top:0, height:'100vh', overflowY:'auto' }}>

        <div style={{ padding:'24px 20px 18px', borderBottom:'1px solid rgba(255,255,255,.1)' }}>
          <div style={{ fontSize:20, fontWeight:900, letterSpacing:3, color:BRAND.yellow }}>BODOGAMI</div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,.4)', letterSpacing:1, marginTop:2 }}>Administração</div>
        </div>

        <nav style={{ flex:1, padding:'8px 0' }}>
          {NAV.map((item, idx) => {
            if (item.type === 'link') {
              const active = section === item.id;
              return (
                <button key={idx} onClick={() => go(item.id)} style={{
                  display:'flex', alignItems:'center', gap:10, width:'100%',
                  padding:'11px 20px', background: active ? 'rgba(255,214,10,.15)' : 'transparent',
                  border:'none', borderLeft: active ? `3px solid ${BRAND.yellow}` : '3px solid transparent',
                  color: active ? BRAND.yellow : 'rgba(255,255,255,.7)',
                  fontWeight: active ? 800 : 600, fontSize:14, cursor:'pointer', fontFamily:'inherit',
                  textAlign:'left',
                }}>
                  <span style={{ fontSize:16 }}>{item.icon}</span>
                  {item.label}
                </button>
              );
            }
            // group
            const open      = openGroups[item.label] ?? false;
            const hasActive = item.items.some(i => i.id === section);
            return (
              <div key={idx}>
                <button onClick={() => toggle(item.label)} style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%',
                  padding:'10px 18px 10px 20px', background:'transparent', border:'none',
                  borderLeft: hasActive ? `3px solid ${BRAND.yellow}` : '3px solid transparent',
                  color: hasActive ? BRAND.yellow : 'rgba(255,255,255,.65)',
                  fontWeight: hasActive ? 800 : 600, fontSize:12, cursor:'pointer', fontFamily:'inherit',
                  textTransform:'uppercase', letterSpacing:.6,
                }}>
                  <span style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:15 }}>{item.icon}</span>
                    {item.label}
                  </span>
                  <span style={{ fontSize:9, opacity:.5 }}>{open ? '▲' : '▼'}</span>
                </button>
                {open && (
                  <div>
                    {item.items.map(sub => {
                      const active = section === sub.id;
                      return (
                        <button key={sub.id} onClick={() => go(sub.id, item.label)} style={{
                          display:'block', width:'100%', padding:'9px 16px 9px 44px',
                          background: active ? 'rgba(255,214,10,.12)' : 'transparent',
                          border:'none', borderLeft: active ? `3px solid ${BRAND.yellow}` : '3px solid transparent',
                          color: active ? BRAND.yellow : 'rgba(255,255,255,.55)',
                          fontWeight: active ? 700 : 400, fontSize:13, cursor:'pointer',
                          fontFamily:'inherit', textAlign:'left',
                        }}>
                          {sub.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div style={{ padding:'14px 20px', borderTop:'1px solid rgba(255,255,255,.1)' }}>
          <Link to="/" style={{ color:'rgba(255,255,255,.45)', fontSize:12, textDecoration:'none', fontWeight:600 }}>
            ← Voltar ao Painel
          </Link>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex:1, padding:'32px 36px', overflowY:'auto', minWidth:0 }}>
        {renderSection(section)}
      </main>

    </div>
  );
}
