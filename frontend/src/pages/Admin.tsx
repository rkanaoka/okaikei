import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BRAND, EmptyPlaceholder } from './admin/shared';

import Dashboard            from './admin/Dashboard';
import Cardapio              from './admin/Cardapio';
import Categorias           from './admin/Categorias';
import FormasPagamento      from './admin/FormasPagamento';
import AcertoGarcons        from './admin/AcertoGarcons';
import FrentesCaixa         from './admin/FrentesCaixa';
import ItensVendidos        from './admin/ItensVendidos';
import Faturamento          from './admin/Faturamento';
import TempoStatus          from './admin/TempoStatus';
import MotivosCancelamento  from './admin/MotivosCancelamento';
import MotivosDesconto      from './admin/MotivosDesconto';
import Vouchers             from './admin/Vouchers';
import ModelosImpressao     from './admin/ModelosImpressao';
import ConfigLoja           from './admin/ConfigLoja';
import GerarEtiquetas       from './admin/GerarEtiquetas';

// ─── Types ────────────────────────────────────────────────────────────────────
type SectionId =
  | 'dashboard'
  | 'cardapio' | 'cardapio-categorias'
  | 'fin-pagamentos' | 'fin-gorjetas' | 'fin-frentes-caixa'
  | 'rel-clientes'   | 'rel-cupons'
  | 'rel-itens'      | 'rel-faturamento' | 'rel-tempo' | 'rel-faturamento-notion' | 'rel-extrato-notion'
  | 'estoque-etiquetas'
  | 'config-loja'    | 'config-horarios' | 'config-fiscal'
  | 'config-cancelamento' | 'config-desconto' | 'config-impressao';

const NAV: Array<
  | { type:'link';  id:SectionId; label:string; icon:string }
  | { type:'group'; label:string; icon:string; items:{ id:SectionId; label:string }[] }
> = [
  { type:'link',  id:'dashboard', label:'Dashboard', icon:'📊' },
  { type:'group', label:'Cardápio', icon:'🍽️', items:[
    { id:'cardapio',            label:'Itens do Cardápio' },
    { id:'cardapio-categorias', label:'Categorias' },
  ]},
  { type:'group', label:'Financeiro', icon:'💰', items:[
    { id:'fin-pagamentos',    label:'Formas de pagamento' },
    { id:'fin-gorjetas',      label:'Acerto de garçons' },
    { id:'fin-frentes-caixa', label:'Frentes de Caixa' },
  ]},
  { type:'group', label:'Relacionamentos', icon:'👥', items:[
    { id:'rel-clientes', label:'Cadastro de clientes' },
    { id:'rel-cupons',   label:'Vouchers' },
  ]},
  { type:'group', label:'Relatórios', icon:'📈', items:[
    { id:'rel-itens',              label:'Itens vendidos' },
    { id:'rel-faturamento',        label:'Faturamento por dia' },
    { id:'rel-tempo',              label:'Tempo por status' },
    { id:'rel-faturamento-notion', label:'Importar Faturamento (Notion)' },
    { id:'rel-extrato-notion',     label:'Importar Extrato Bancário (Notion)' },
  ]},
  { type:'group', label:'Estoque', icon:'📦', items:[
    { id:'estoque-etiquetas', label:'Gerar Etiquetas de Validade' },
  ]},
  { type:'group', label:'Configurações', icon:'⚙️', items:[
    { id:'config-loja',          label:'Dados da loja' },
    { id:'config-horarios',      label:'Horários de funcionamento' },
    { id:'config-fiscal',        label:'Dados fiscais' },
    { id:'config-cancelamento',  label:'Motivos de cancelamento' },
    { id:'config-desconto',      label:'Motivos de desconto' },
    { id:'config-impressao',     label:'Modelos de impressão' },
  ]},
];

// ─── Renderização de seções ───────────────────────────────────────────────────
function renderSection(id: SectionId) {
  switch(id) {
    case 'dashboard':           return <Dashboard />;
    case 'cardapio':            return <Cardapio />;
    case 'cardapio-categorias': return <Categorias />;
    case 'fin-pagamentos':      return <FormasPagamento />;
    case 'fin-gorjetas':        return <AcertoGarcons />;
    case 'fin-frentes-caixa':   return <FrentesCaixa />;
    case 'rel-clientes':        return <EmptyPlaceholder icon="👤" title="Cadastro de Clientes" subtitle="Módulo em desenvolvimento" />;
    case 'rel-cupons':          return <Vouchers />;
    case 'rel-itens':           return <ItensVendidos />;
    case 'rel-faturamento':     return <Faturamento />;
    case 'rel-tempo':           return <TempoStatus />;
    case 'rel-faturamento-notion': return (
      <div style={{ textAlign:'center', padding:'80px 40px' }}>
        <div style={{ fontSize:56, marginBottom:16 }}>🗂️</div>
        <h2 style={{ margin:0, fontSize:18, fontWeight:800, color:BRAND.navy }}>Importar Faturamento (Notion)</h2>
        <p style={{ margin:'8px 0 24px', color:'#aaa', fontSize:13 }}>
          Envie o PDF mensal "Faturamento por dia" do SAIPOS e sincronize com sua database do Notion.
        </p>
        <Link to="/notion-faturamento" style={{
          display:'inline-block', padding:'10px 22px', borderRadius:8, fontSize:14, fontWeight:700,
          textDecoration:'none', color:'#fff',
          background:`linear-gradient(135deg,${BRAND.orange},${BRAND.red})`,
        }}>
          Abrir importador →
        </Link>
      </div>
    );
    case 'rel-extrato-notion': return (
      <div style={{ textAlign:'center', padding:'80px 40px' }}>
        <div style={{ fontSize:56, marginBottom:16 }}>🏦</div>
        <h2 style={{ margin:0, fontSize:18, fontWeight:800, color:BRAND.navy }}>Importar Extrato Bancário (Notion)</h2>
        <p style={{ margin:'8px 0 24px', color:'#aaa', fontSize:13 }}>
          Envie o extrato mensal do Itaú e sincronize os lançamentos com o Notion.
        </p>
        <Link to="/notion-extrato" style={{
          display:'inline-block', padding:'10px 22px', borderRadius:8, fontSize:14, fontWeight:700,
          textDecoration:'none', color:'#fff',
          background:`linear-gradient(135deg,${BRAND.orange},${BRAND.red})`,
        }}>
          Abrir importador →
        </Link>
      </div>
    );
    case 'estoque-etiquetas':   return <GerarEtiquetas />;
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
    'Relatórios': false, 'Estoque': false, 'Configurações': false,
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
