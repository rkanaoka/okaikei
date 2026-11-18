import { useEffect, useState } from 'react';
import { fiscalApi, FiscalOverview, FiscalSettings } from '@/services/api';
import { BRAND, Card, PageHeader, Btn, Field, inputStyle } from './shared';

const Pill = ({ ok, children }: { ok: boolean; children: React.ReactNode }) => (
  <span style={{ fontSize:11, fontWeight:800, padding:'3px 10px', borderRadius:20,
    background: ok ? '#2DC65318' : '#E6394618', color: ok ? BRAND.green : BRAND.red }}>{children}</span>
);

export default function FiscalConfig() {
  const [data, setData]       = useState<FiscalOverview | null>(null);
  const [form, setForm]       = useState<FiscalSettings | null>(null);
  const [saving, setSaving]   = useState(false);
  const [toggling, setToggling] = useState(false);
  const [err, setErr]         = useState('');
  const [ok, setOk]           = useState('');

  function apply(o: FiscalOverview) { setData(o); setForm(o.settings); }

  useEffect(() => { fiscalApi.overview().then(apply).catch((e) => setErr(e.message)); }, []);

  if (!data || !form) return <p style={{ color: err ? BRAND.red : '#aaa', fontSize:13 }}>{err || 'Carregando...'}</p>;

  const set = <K extends keyof FiscalSettings>(k: K, v: FiscalSettings[K]) => setForm({ ...form, [k]: v });

  async function save() {
    setSaving(true); setErr(''); setOk('');
    try { apply(await fiscalApi.saveSettings(form!)); setOk('Configurações salvas.'); }
    catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  }

  async function toggle() {
    const next = !data!.enabled;
    if (next && !window.confirm('Ativar o módulo fiscal? Novas vendas fechadas passarão a gerar NFC-e conforme as configurações abaixo.')) return;
    if (!next && !window.confirm('Desativar o módulo fiscal? O PDV segue normal; configurações e histórico são mantidos.')) return;
    setToggling(true); setErr(''); setOk('');
    try { await fiscalApi.setEnabled(next); apply(await fiscalApi.overview()); }
    catch (e: any) { setErr(e.message); }
    finally { setToggling(false); }
  }

  const tokenOk = data.token.ambienteAtivoConfigurado;

  return (
    <div>
      <PageHeader title="Fiscal — Configuração" subtitle="Emissão de NFC-e (modelo 65) via Focus NFe" />

      <div style={{ background:'#FFF8E1', border:'1px solid #FFD60A', borderRadius:10, padding:'10px 14px', fontSize:12, color:'#7a5b00', marginBottom:16 }}>
        As informações tributárias (CFOP, CST/CSOSN, NCM, PIS/COFINS, IBS/CBS…) devem ser validadas pelo contador responsável.
        Nenhum código é preenchido automaticamente pelo sistema.
      </div>

      <Card style={{ marginBottom:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:16, flexWrap:'wrap' }}>
          <div>
            <div style={{ fontSize:15, fontWeight:800, color:BRAND.navy }}>Módulo fiscal</div>
            <div style={{ fontSize:12, color:'#888', marginTop:2 }}>
              Desligado: o PDV funciona normalmente, sem nenhuma chamada à Focus NFe. Configurações e histórico são preservados.
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <Pill ok={data.enabled}>{data.enabled ? 'ATIVO' : 'DESATIVADO'}</Pill>
            <Btn variant={data.enabled ? 'ghost' : 'primary'} onClick={toggle} disabled={toggling}>
              {data.enabled ? 'Desativar' : 'Ativar'}
            </Btn>
          </div>
        </div>
      </Card>

      {data.pendencias.length > 0 && (
        <Card style={{ marginBottom:16, borderColor:BRAND.orange }}>
          <div style={{ fontWeight:800, color:BRAND.orange, fontSize:13, marginBottom:6 }}>Pendências para emitir</div>
          <ul style={{ margin:0, paddingLeft:18, fontSize:13, color:'#666' }}>
            {data.pendencias.map((p) => <li key={p}>{p}</li>)}
          </ul>
        </Card>
      )}

      <Card style={{ marginBottom:16 }}>
        <div style={{ fontSize:15, fontWeight:800, color:BRAND.navy, marginBottom:14 }}>Ambiente e token</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:16 }}>
          <Field label="Ambiente">
            <select value={form.ambiente} onChange={(e) => set('ambiente', e.target.value as any)} style={inputStyle}>
              <option value="homologacao">Homologação (testes, sem valor fiscal)</option>
              <option value="producao">Produção</option>
            </select>
          </Field>
          <Field label="Token da Focus NFe">
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', fontSize:12 }}>
              <span>Homologação: <Pill ok={data.token.homologacao}>{data.token.homologacao ? 'configurado' : 'ausente'}</Pill></span>
              <span>Produção: <Pill ok={data.token.producao}>{data.token.producao ? 'configurado' : 'ausente'}</Pill></span>
            </div>
          </Field>
        </div>
        <p style={{ margin:'0', fontSize:12, color: tokenOk ? '#888' : BRAND.red }}>
          Os tokens ficam apenas no servidor: <code>FOCUS_NFE_TOKEN_HOMOLOGACAO</code> e <code>FOCUS_NFE_TOKEN_PRODUCAO</code> no <code>.env</code> do backend
          (reinicie o backend após alterar). Eles nunca são exibidos aqui.
        </p>
        {form.ambiente === 'producao' && (
          <p style={{ margin:'8px 0 0', fontSize:12, color:BRAND.red, fontWeight:700 }}>
            Produção: as notas emitidas têm valor fiscal real.
          </p>
        )}
      </Card>

      <Card style={{ marginBottom:16 }}>
        <div style={{ fontSize:15, fontWeight:800, color:BRAND.navy, marginBottom:14 }}>Emitente</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:16 }}>
          <Field label="CNPJ"><input value={form.cnpjEmitente} onChange={(e) => set('cnpjEmitente', e.target.value)} maxLength={18} placeholder="Somente números" style={inputStyle} /></Field>
          <Field label="Inscrição estadual"><input value={form.inscricaoEstadual} onChange={(e) => set('inscricaoEstadual', e.target.value)} maxLength={20} style={inputStyle} /></Field>
          <Field label="Razão social"><input value={form.razaoSocial} onChange={(e) => set('razaoSocial', e.target.value)} maxLength={200} style={inputStyle} /></Field>
          <Field label="Nome fantasia"><input value={form.nomeFantasia} onChange={(e) => set('nomeFantasia', e.target.value)} maxLength={200} style={inputStyle} /></Field>
          <Field label="Endereço (impresso no DANFE-NFC-e)"><input value={form.endereco} onChange={(e) => set('endereco', e.target.value)} maxLength={200} style={inputStyle} /></Field>
          <Field label="Regime tributário">
            <select value={form.regime} onChange={(e) => set('regime', e.target.value as any)} style={inputStyle}>
              <option value="simples">Simples Nacional (CSOSN)</option>
              <option value="normal">Regime normal (CST)</option>
            </select>
          </Field>
          <Field label="Natureza da operação"><input value={form.naturezaOperacao} onChange={(e) => set('naturezaOperacao', e.target.value)} maxLength={60} style={inputStyle} /></Field>
        </div>
        <p style={{ margin:0, fontSize:12, color:'#888' }}>
          O CSC (código de segurança do contribuinte) e o certificado ficam cadastrados na própria empresa na Focus NFe — não são guardados aqui.
        </p>
      </Card>

      <Card style={{ marginBottom:16 }}>
        <div style={{ fontSize:15, fontWeight:800, color:BRAND.navy, marginBottom:10 }}>Comportamento</div>
        {([
          ['autoEmit', 'Emitir automaticamente ao fechar a comanda (assíncrono; nunca atrasa nem bloqueia o fechamento)'],
          ['printAfterAuthorize', 'Imprimir o DANFE-NFC-e na impressora do caixa após a autorização'],
          ['exigirIbsCbs', 'Exigir CST e classificação de IBS/CBS nos itens (Reforma Tributária — confirmar vigência com o contador)'],
        ] as const).map(([k, label]) => (
          <label key={k} style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'#555', marginBottom:8, cursor:'pointer' }}>
            <input type="checkbox" checked={form[k]} onChange={(e) => set(k, e.target.checked)} /> {label}
          </label>
        ))}
        <Field label="Tempo máximo de espera pela Focus NFe (ms)">
          <input type="number" min={5000} max={120000} step={1000} value={form.timeoutMs}
            onChange={(e) => set('timeoutMs', Number(e.target.value))} style={{ ...inputStyle, width:180 }} />
        </Field>
      </Card>

      <Card style={{ marginBottom:16 }}>
        <div style={{ fontSize:15, fontWeight:800, color:BRAND.navy, marginBottom:4 }}>Formas de pagamento → forma fiscal</div>
        <p style={{ margin:'0 0 12px', fontSize:12, color:'#888' }}>
          Sem equivalência configurada, a nota não é emitida (nada é presumido). Cartão: o PDV não integra com TEF, então é enviado como pagamento não integrado.
        </p>
        <table style={{ width:'100%', fontSize:13, borderCollapse:'collapse' }}>
          <tbody>
            {data.paymentMethods.map((m) => (
              <tr key={m.code} style={{ borderBottom:'1px solid #f5f5f5', opacity: m.active ? 1 : .5 }}>
                <td style={{ padding:'8px 0', fontWeight:700, color:BRAND.navy }}>{m.label} <span style={{ color:'#aaa', fontFamily:'monospace', fontWeight:400 }}>{m.code}</span></td>
                <td style={{ padding:'8px 0', width:280 }}>
                  <select value={form.paymentMethodMap[m.code] ?? ''} style={inputStyle}
                    onChange={(e) => set('paymentMethodMap', { ...form.paymentMethodMap, [m.code]: e.target.value })}>
                    <option value="">— não configurado —</option>
                    {Object.entries(data.formasPagamentoFiscais).map(([c, l]) => <option key={c} value={c}>{c} — {l}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {err && <p style={{ color:BRAND.red, fontSize:13, margin:'0 0 12px' }}>{err}</p>}
      {ok && <p style={{ color:BRAND.green, fontSize:13, margin:'0 0 12px', fontWeight:700 }}>{ok}</p>}
      <Btn onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar configurações'}</Btn>
    </div>
  );
}
