import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { comandasApi, syncApi } from '@/services/api';
import { useSocketEvent, useJoinRoom } from '@/hooks/useSocket';
import { WS_EVENTS } from '@/services/socket';
import CashRegisterMenu from '@/components/CashRegisterMenu';

const BRAND = { navy:'#0D1B2A', yellow:'#FFD60A', orange:'#FF6B2B', red:'#E63946', green:'#2DC653' };
const fmtBRL = (v: any) => `R$ ${parseFloat(v||0).toFixed(2).replace('.',',')}`;
const fmtTime = (d: string) => new Date(d).toLocaleString('pt-BR',{ timeZone:'America/Sao_Paulo', hour:'2-digit', minute:'2-digit' });

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  OPEN:      { label:'Aberta',    color: BRAND.orange, bg:'#FF6B2B18' },
  PREPARING: { label:'Em Preparo',color:'#b38600',     bg:'#FFD60A22' },
  CLOSED:    { label:'Fechada',   color: BRAND.green,  bg:'#2DC65318' },
};

// Ordena "Mesa 2" antes de "Mesa 10" (numérico), com fallback alfabético para o resto
function naturalCompare(a: string, b: string) {
  const pa = a.match(/(\d+)|(\D+)/g) ?? [];
  const pb = b.match(/(\d+)|(\D+)/g) ?? [];
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? '', y = pb[i] ?? '';
    if (x === y) continue;
    const nx = parseInt(x, 10), ny = parseInt(y, 10);
    if (!isNaN(nx) && !isNaN(ny)) return nx - ny;
    return x < y ? -1 : 1;
  }
  return 0;
}

function groupByTable(comandas: any[]) {
  const map = new Map<string, any[]>();
  for (const c of comandas) {
    const key = c.table?.label ?? c.tableId ?? '—';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(c);
  }
  return [...map.entries()].sort((a, b) => naturalCompare(a[0], b[0]));
}

// Total da comanda já contando a gorjeta compulsória de 10% mesmo quando ainda
// não foi persistida no banco (só é gravada no fechamento da conta)
function comandaTotalWithGratuity(c: any) {
  const subtotal = c.subtotal ?? (c.items?.reduce((s:any,i:any)=>s+i.quantity*parseFloat(i.unitPrice),0) ?? 0);
  if (c.surchargeType) {
    const sv = parseFloat(c.surchargeValue) || 0;
    const surcharge = c.surchargeType === 'percent' ? subtotal * sv / 100 : sv;
    const dv = parseFloat(c.discountValue) || 0;
    const discount = c.discountType === 'percent' ? subtotal * dv / 100 : dv;
    return Math.max(0, subtotal + surcharge - discount);
  }
  return subtotal * 1.10;
}

const FILTERS = [
  { key:'active',    label:'Ativas' },
  { key:'OPEN',      label:'Abertas' },
  { key:'PREPARING', label:'Em Preparo' },
  { key:'CLOSED',    label:'Fechadas' },
  { key:'',          label:'Todas' },
];

function SyncBadge({ status }: { status: any }) {
  if (!status) return null;
  return (
    <div className="sync-badge">
      <span className={`sync-dot ${status.cloudOnline ? 'online' : 'offline'}`} />
      {status.cloudOnline ? 'Nuvem OK' : 'Offline'}
      {status.pending > 0 && ` · ${status.pending} pendente(s)`}
      <style>{`
        .sync-badge { display:flex; align-items:center; gap:6px; font-size:11px; color:#fff8; font-weight:600; }
        .sync-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
        .sync-dot.online  { background:${BRAND.green}; box-shadow:0 0 6px ${BRAND.green}; }
        .sync-dot.offline { background:${BRAND.red}; }
      `}</style>
    </div>
  );
}

function ComandaCard({ comanda, showTable = true }: { comanda: any; showTable?: boolean }) {
  const cfg     = STATUS[comanda.status] ?? STATUS.OPEN;
  const elapsed = Math.floor((Date.now() - new Date(comanda.openedAt).getTime()) / 60000);
  const elapsedStr = elapsed < 60 ? `${elapsed} min` : `${Math.floor(elapsed/60)}h${String(elapsed%60).padStart(2,'0')}`;
  const subtotal = (comanda.subtotal ?? comanda.items?.reduce((s:any,i:any)=>s+i.quantity*parseFloat(i.unitPrice),0) ?? 0);

  return (
    <Link to={`/caixa/${comanda.id}`} style={{ textDecoration:'none', display:'block' }}>
      <div className="comanda-card" style={{ borderLeftColor: cfg.color }}>
        <div className="card-header">
          <div className="mesa">{showTable ? (comanda.table?.label ?? comanda.tableId ?? '—') : (comanda.customerName || 'Sem nome')}</div>
          <div className="status-badge" style={{ color:cfg.color, background:cfg.bg }}>{cfg.label}</div>
        </div>
        {showTable && comanda.customerName && <div className="customer">{comanda.customerName}</div>}
        <div className="card-footer">
          <span className="meta">🕐 {fmtTime(comanda.openedAt)} · {elapsedStr}</span>
          <span className="meta">📋 {comanda.items?.length ?? 0} item(s)</span>
          <span className="total">{fmtBRL(subtotal)}</span>
        </div>
      </div>
    </Link>
  );
}

export default function Painel() {
  const [comandas, setComandas] = useState<any[]>([]);
  const [filter, setFilter]     = useState('active');
  const [loading, setLoading]   = useState(true);
  const [lastUpdate, setLast]   = useState<Date|null>(null);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [merging, setMerging]   = useState<string | null>(null);

  useJoinRoom('dashboard');

  const load = useCallback(async () => {
    try {
      const status = (filter === 'active' || filter === '') ? undefined : filter;
      let data: any = await comandasApi.list(status);
      if (filter === 'active') data = data.filter((c:any) => c.status !== 'CLOSED' && c.status !== 'CANCELLED');
      setComandas(data);
      setLast(new Date());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); const t = setInterval(load, 1800000); return () => clearInterval(t); }, [load]);

  useEffect(() => {
    syncApi.status().then(setSyncStatus).catch(()=>{});
    const t = setInterval(() => syncApi.status().then(setSyncStatus).catch(()=>{}), 30000);
    return () => clearInterval(t);
  }, []);

  async function handleMerge(tableLabel: string, list: any[]) {
    if (list.length < 2) return;
    const tableId = list[0].tableId ?? list[0].table?.id;
    if (!tableId) { alert('Não foi possível identificar a mesa.'); return; }
    if (!window.confirm(`Juntar as ${list.length} comandas da mesa ${tableLabel} em uma só? Um comprovante será impresso no caixa.`)) return;
    setMerging(tableLabel);
    try {
      await comandasApi.mergeTable(tableId);
      await load();
    } catch (e:any) {
      alert(e.message);
    } finally {
      setMerging(null);
    }
  }

  // Atualizações em tempo real via WebSocket
  useSocketEvent(WS_EVENTS.COMANDA_CREATED, () => load());
  useSocketEvent(WS_EVENTS.COMANDA_UPDATED, () => load());
  useSocketEvent(WS_EVENTS.COMANDA_CLOSED,  () => load());
  useSocketEvent(WS_EVENTS.SYNC_STATUS, setSyncStatus);

  const summary = {
    open:      comandas.filter(c=>c.status==='OPEN').length,
    preparing: comandas.filter(c=>c.status==='PREPARING').length,
    closed:    comandas.filter(c=>c.status==='CLOSED').length,
    revenue:   comandas.filter(c=>c.status==='CLOSED').reduce((s:number,c:any)=>s+parseFloat(c.subtotal||0),0),
  };

  return (
    <div className="page">
      <header className="header">
        <div>
          <div className="logo">BODOGAMI</div>
          <div className="system-label">Frente de Caixa</div>
        </div>
        <nav className="nav">
          <SyncBadge status={syncStatus} />
          <CashRegisterMenu />
          <Link to="/garcom" className="nav-btn">🧑‍🍳 Garçom</Link>
          <Link to="/admin" className="nav-btn">⚙️ Admin</Link>
          <button className="nav-btn icon-btn" onClick={load}>⟳</button>
        </nav>
      </header>

      <div className="summary-bar">
        {[
          { val: summary.open,      label: 'Abertas',    color: BRAND.orange, bg: '#FF6B2B18' },
          { val: summary.preparing, label: 'Em Preparo', color: '#9a7200',    bg: '#FFD60A22' },
          { val: summary.closed,    label: 'Fechadas',   color: BRAND.green,  bg: '#2DC65318' },
          { val: fmtBRL(summary.revenue), label: 'Faturado', color: BRAND.navy, bg: `${BRAND.navy}12` },
        ].map(c => (
          <div key={c.label} className="chip" style={{ background:c.bg, color:c.color }}>
            <span className="chip-val">{c.val}</span>
            <span className="chip-label">{c.label}</span>
          </div>
        ))}
      </div>

      <div className="filters">
        {FILTERS.map(f => (
          <button key={f.key} className={`filter-btn ${filter===f.key?'active':''}`} onClick={()=>setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      {lastUpdate && <div className="last-update">Atualizado às {lastUpdate.toLocaleTimeString('pt-BR')} · Auto-refresh 10min</div>}

      <div className="main">
        {loading ? (
          <div className="empty"><div className="spinner" /></div>
        ) : comandas.length === 0 ? (
          <div className="empty">
            <div style={{ fontSize:60 }}>🍱</div>
            <div style={{ fontSize:18, fontWeight:700, color:'#888' }}>Nenhuma comanda</div>
            <Link to="/garcom" style={{ color:BRAND.orange, fontWeight:700 }}>Abrir primeira →</Link>
          </div>
        ) : filter === 'active' ? (
          <div className="table-groups">
            {groupByTable(comandas).map(([table, list]) => {
              const groupTotal = list.reduce((s, c) => s + comandaTotalWithGratuity(c), 0);
              return (
                <div key={table} className="table-group">
                  <div className="table-group-header">
                    <span>{table}</span>
                    <span className="table-group-count">{list.length}</span>
                    <span className="table-group-total">{fmtBRL(groupTotal)}</span>
                    {list.length > 1 && (
                      <button className="merge-btn" onClick={() => handleMerge(table, list)} disabled={merging === table}>
                        {merging === table ? 'Juntando…' : '🔗 Juntar Comandas'}
                      </button>
                    )}
                  </div>
                  <div className="grid">
                    {list.map(c => <ComandaCard key={c.id} comanda={c} showTable={false} />)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid">{comandas.map(c => <ComandaCard key={c.id} comanda={c} />)}</div>
        )}
      </div>

      <Link to="/garcom" className="fab">+</Link>

      <style>{`
        .page { min-height:100vh; background:var(--bg); padding-bottom:80px; }
        .header { background:var(--navy); padding:16px 24px; display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid var(--yellow); position:sticky; top:0; z-index:10; }
        .logo { font-size:24px; font-weight:900; color:var(--yellow); letter-spacing:3px; }
        .system-label { font-size:11px; color:#fff6; letter-spacing:2px; text-transform:uppercase; margin-top:2px; }
        .nav { display:flex; gap:10px; align-items:center; }
        .nav-btn { display:inline-flex; align-items:center; gap:6px; padding:8px 16px; border-radius:999px; border:2px solid #fff3; background:transparent; color:#fff; font-weight:700; font-size:13px; cursor:pointer; text-decoration:none; transition:border-color .15s; }
        .nav-btn:hover { border-color:var(--yellow); color:var(--yellow); }
        .icon-btn { padding:8px 14px; font-size:18px; }
        .summary-bar { display:flex; gap:12px; padding:16px 20px; overflow-x:auto; scrollbar-width:none; }
        .summary-bar::-webkit-scrollbar { display:none; }
        .chip { flex-shrink:0; display:flex; flex-direction:column; align-items:center; padding:12px 20px; border-radius:14px; min-width:90px; }
        .chip-val { font-size:22px; font-weight:900; }
        .chip-label { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.5px; margin-top:2px; opacity:.8; }
        .filters { display:flex; gap:8px; padding:0 20px 12px; overflow-x:auto; scrollbar-width:none; }
        .filters::-webkit-scrollbar { display:none; }
        .filter-btn { flex-shrink:0; padding:7px 18px; border-radius:999px; border:2px solid ${BRAND.navy}30; background:#fff; color:#666; font-weight:700; font-size:13px; cursor:pointer; transition:all .15s; }
        .filter-btn.active { background:var(--navy); color:var(--yellow); border-color:var(--navy); }
        .last-update { font-size:11px; color:#aaa; padding:0 20px 12px; font-weight:600; }
        .main { padding:0 16px; }
        .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:14px; }
        .table-groups { display:flex; flex-direction:column; gap:26px; }
        .table-group-header { display:flex; align-items:center; gap:10px; margin-bottom:12px; padding-left:2px; }
        .table-group-header span:first-child { font-size:17px; font-weight:900; color:var(--navy); }
        .table-group-count { font-size:12px; font-weight:700; color:#fff; background:var(--orange); padding:2px 9px; border-radius:999px; }
        .table-group-total { font-size:13px; font-weight:800; color:var(--navy); background:#fff; border:1.5px solid ${BRAND.navy}25; padding:3px 12px; border-radius:999px; }
        .merge-btn { margin-left:auto; padding:6px 14px; border-radius:999px; border:none; background:var(--navy); color:var(--yellow); font-weight:700; font-size:12px; cursor:pointer; font-family:inherit; }
        .merge-btn:disabled { opacity:.5; cursor:not-allowed; }
        .comanda-card { background:#fff; border:2px solid var(--navy); border-left:5px solid; border-radius:16px; padding:18px 16px; cursor:pointer; transition:transform .12s; box-shadow:3px 3px 0 ${BRAND.navy}15; }
        .comanda-card:hover { transform:translateY(-2px); }
        .card-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px; }
        .mesa { font-size:20px; font-weight:900; color:var(--navy); }
        .status-badge { font-size:11px; font-weight:700; padding:3px 10px; border-radius:999px; text-transform:uppercase; }
        .customer { font-size:13px; color:#888; margin-bottom:12px; }
        .card-footer { display:flex; align-items:center; flex-wrap:wrap; gap:8px; margin-top:10px; padding-top:10px; border-top:1px solid #f0ebe5; }
        .meta { font-size:12px; color:#999; }
        .total { font-size:16px; font-weight:900; color:var(--navy); margin-left:auto; }
        .empty { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:40vh; gap:16px; }
        .spinner { width:40px; height:40px; border-radius:50%; border:4px solid #ccc; border-top-color:var(--orange); animation:spin .7s linear infinite; }
        @keyframes spin { to { transform:rotate(360deg); } }
        .fab { position:fixed; bottom:24px; right:24px; width:60px; height:60px; border-radius:50%; background:linear-gradient(135deg,var(--orange),var(--red)); color:#fff; font-size:32px; font-weight:900; display:flex; align-items:center; justify-content:center; text-decoration:none; box-shadow:0 6px 24px rgba(230,57,70,.4); transition:transform .15s; }
        .fab:hover { transform:scale(1.08); }
      `}</style>
    </div>
  );
}
