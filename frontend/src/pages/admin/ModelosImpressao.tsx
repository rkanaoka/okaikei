import { useState, useEffect, useCallback } from 'react';
import { printTemplatesApi } from '@/services/api';
import { BRAND, fmtBRL, Card, PageHeader, Btn } from './shared';

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

export default function ModelosImpressao() {
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
