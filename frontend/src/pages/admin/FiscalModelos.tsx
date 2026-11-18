import { useEffect, useState } from 'react';
import { fiscalApi, FiscalTemplate, FiscalTemplateCfop, FiscalTemplateData } from '@/services/api';
import { BRAND, Card, PageHeader, Btn, Field, ModalShell, TableHead, inputStyle, labelStyle } from './shared';
import { ICMS_CST, ICMS_CSOSN, PIS_COFINS, IBS_CBS_CST, ORIGENS, MOD_BC, MOD_BC_ST } from './fiscalOptions';

type Tab = 'impostos' | 'cfops' | 'cest';

type Form = {
  id?: string;
  name: string; description: string; active: boolean;
  ncm: string; origem: string; codigoBeneficio: string; unidadeComercial: string;
  creditoCodigo: string; creditoPercentual: string;
  cest: string; escalaRelevante: boolean; cnpjFabricante: string;
  icmsModalidade: string; icmsReducao: string; icmsAliquota: string; icmsFcp: string; icmsCreditoSimples: string;
  stModalidade: string; stReducao: string; stAliquota: string; stMva: string; stFcp: string;
  pisAliquota: string; cofinsAliquota: string;
  ibsSituacao: string; ibsClassificacao: string; ibsUf: string; ibsMun: string; cbs: string;
  cfops: FiscalTemplateCfop[];
  extra: Array<{ k: string; v: string }>;
};

const v = (x: unknown) => (x === null || x === undefined ? '' : String(x));

const emptyForm = (): Form => ({
  name: '', description: '', active: true, ncm: '', origem: '', codigoBeneficio: '', unidadeComercial: 'UN',
  creditoCodigo: '', creditoPercentual: '', cest: '', escalaRelevante: true, cnpjFabricante: '',
  icmsModalidade: '', icmsReducao: '', icmsAliquota: '', icmsFcp: '', icmsCreditoSimples: '',
  stModalidade: '', stReducao: '', stAliquota: '', stMva: '', stFcp: '',
  pisAliquota: '', cofinsAliquota: '', ibsSituacao: '', ibsClassificacao: '', ibsUf: '', ibsMun: '', cbs: '',
  cfops: [], extra: [],
});

function toForm(t: FiscalTemplate, asCopy = false): Form {
  const d = t.data;
  return {
    id: asCopy ? undefined : t.id, name: asCopy ? `${t.name} (cópia)` : t.name, description: v(t.description), active: t.active,
    ncm: v(d.ncm), origem: v(d.origem), codigoBeneficio: v(d.codigoBeneficio), unidadeComercial: v(d.unidadeComercial) || 'UN',
    creditoCodigo: v(d.creditoPresumido?.codigo), creditoPercentual: v(d.creditoPresumido?.percentual),
    cest: v(d.cest), escalaRelevante: d.escalaRelevante !== false, cnpjFabricante: v(d.cnpjFabricante),
    icmsModalidade: v(d.icms?.modalidadeBase), icmsReducao: v(d.icms?.reducaoBase), icmsAliquota: v(d.icms?.aliquota),
    icmsFcp: v(d.icms?.fcp), icmsCreditoSimples: v(d.icms?.aliquotaCreditoSimples),
    stModalidade: v(d.icmsSt?.modalidadeBase), stReducao: v(d.icmsSt?.reducaoBase), stAliquota: v(d.icmsSt?.aliquota),
    stMva: v(d.icmsSt?.mva), stFcp: v(d.icmsSt?.fcp),
    pisAliquota: v(d.pis?.aliquota), cofinsAliquota: v(d.cofins?.aliquota),
    ibsSituacao: v(d.ibsCbs?.situacao), ibsClassificacao: v(d.ibsCbs?.classificacao),
    ibsUf: v(d.ibsCbs?.ibsUfAliquota), ibsMun: v(d.ibsCbs?.ibsMunAliquota), cbs: v(d.ibsCbs?.cbsAliquota),
    cfops: (d.cfops ?? []).map((c) => ({ ...c })),
    extra: Object.entries(d.extra ?? {}).map(([k, x]) => ({ k, v: String(x) })),
  };
}

function toData(f: Form): FiscalTemplateData {
  const extra: Record<string, string> = {};
  for (const { k, v: val } of f.extra) if (k.trim() && val.trim()) extra[k.trim()] = val.trim().replace(',', '.');
  return {
    ncm: f.ncm, cest: f.cest, origem: f.origem, codigoBeneficio: f.codigoBeneficio, unidadeComercial: f.unidadeComercial,
    escalaRelevante: f.cest.trim() ? f.escalaRelevante : null, cnpjFabricante: f.cnpjFabricante,
    creditoPresumido: { codigo: f.creditoCodigo, percentual: f.creditoPercentual },
    icms: { modalidadeBase: f.icmsModalidade, reducaoBase: f.icmsReducao, aliquota: f.icmsAliquota, fcp: f.icmsFcp, aliquotaCreditoSimples: f.icmsCreditoSimples },
    icmsSt: { modalidadeBase: f.stModalidade, reducaoBase: f.stReducao, aliquota: f.stAliquota, mva: f.stMva, fcp: f.stFcp },
    pis: { aliquota: f.pisAliquota }, cofins: { aliquota: f.cofinsAliquota },
    ibsCbs: { situacao: f.ibsSituacao, classificacao: f.ibsClassificacao, ibsUfAliquota: f.ibsUf, ibsMunAliquota: f.ibsMun, cbsAliquota: f.cbs },
    cfops: f.cfops,
    extra: Object.keys(extra).length ? extra : null,
  };
}

const EXTRA_SUGGESTIONS = [
  'icms_motivo_desoneracao', 'icms_valor_desonerado', 'fcp_base_calculo', 'pis_quantidade_vendida', 'pis_aliquota_valor',
  'cofins_quantidade_vendida', 'cofins_aliquota_valor', 'ibs_cbs_indicacao_doacao',
];

export default function FiscalModelos() {
  const [rows, setRows]   = useState<FiscalTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm]   = useState<Form | null>(null);
  const [tab, setTab]     = useState<Tab>('impostos');
  const [cfopSel, setCfopSel] = useState(0);
  const [newCfop, setNewCfop] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr]     = useState('');
  const [errList, setErrList] = useState<string[]>([]);

  async function load() {
    setLoading(true);
    try { setRows(await fiscalApi.templates()); setErr(''); }
    catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  function open(f: Form) { setForm(f); setTab('impostos'); setCfopSel(0); setNewCfop(''); setErr(''); setErrList([]); }
  const set = (patch: Partial<Form>) => form && setForm({ ...form, ...patch });

  async function save() {
    if (!form) return;
    setSaving(true); setErr(''); setErrList([]);
    try {
      const payload = { name: form.name, description: form.description || null, active: form.active, data: toData(form) };
      if (form.id) await fiscalApi.updateTemplate(form.id, payload);
      else await fiscalApi.createTemplate(payload);
      setForm(null); await load();
    } catch (e: any) {
      setErr(e.message);
      setErrList((e.errors ?? []).map((x: any) => x.message ?? String(x)));
    } finally { setSaving(false); }
  }

  async function toggleActive(t: FiscalTemplate) {
    try { await fiscalApi.setTemplateActive(t.id, !t.active); await load(); } catch (e: any) { setErr(e.message); }
  }
  async function remove(t: FiscalTemplate) {
    if (!window.confirm(`Excluir o modelo "${t.name}"?`)) return;
    try { await fiscalApi.deleteTemplate(t.id); await load(); } catch (e: any) { setErr(e.message); }
  }

  function addCfop() {
    if (!form) return;
    const c = newCfop.replace(/\D/g, '');
    if (!/^[1-7]\d{3}$/.test(c)) { setErr('CFOP deve ter 4 dígitos (iniciando de 1 a 7)'); return; }
    if (form.cfops.some((x) => x.cfop === c)) { setErr(`CFOP ${c} já está no modelo`); return; }
    setErr('');
    set({ cfops: [...form.cfops, { cfop: c, icmsSituacao: '', pisSituacao: '', cofinsSituacao: '' }] });
    setCfopSel(form.cfops.length); setNewCfop('');
  }
  const patchCfop = (i: number, p: Partial<FiscalTemplateCfop>) =>
    form && set({ cfops: form.cfops.map((c, j) => (j === i ? { ...c, ...p } : c)) });

  const Num = ({ label, value, onChange, width }: { label: string; value: string; onChange: (x: string) => void; width?: number }) => (
    <div style={{ width: width ?? 140 }}>
      <label style={labelStyle}>{label}</label>
      <input type="number" step="any" min={0} value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
    </div>
  );
  const Sel = ({ value, onChange, options, disabled }: { value: string; onChange: (x: string) => void; options: Array<[string, string]>; disabled?: boolean }) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} style={inputStyle}>
      <option value="">— não informado —</option>
      {options.map(([c, l]) => <option key={c} value={c}>{l}</option>)}
    </select>
  );
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: BRAND.navy, margin: '0 0 8px' }}>{title}</div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>{children}</div>
    </div>
  );

  const cf = form?.cfops[cfopSel];

  return (
    <div>
      <PageHeader title="Fiscal — Dados fiscais"
        subtitle="Modelos de dados fiscais por grupo de produtos (alcoólicos, bebidas industrializadas, comida, jogos de tabuleiro…)"
        action={<Btn onClick={() => open(emptyForm())}>+ Novo modelo</Btn>} />

      <div style={{ background:'#FFF8E1', border:'1px solid #FFD60A', borderRadius:10, padding:'10px 14px', fontSize:12, color:'#7a5b00', marginBottom:16 }}>
        Um modelo reúne impostos, CFOPs, NCM, CEST e origem. Depois, em <b>Classificação dos produtos</b>, basta escolher o modelo de cada
        produto. Alterar o modelo atualiza todos os produtos vinculados. Preencha apenas com a orientação do contador.
      </div>

      {err && !form && <p style={{ color: BRAND.red, fontSize: 13 }}>{err}</p>}
      {loading ? <p style={{ color: '#aaa', fontSize: 13 }}>Carregando...</p> : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <TableHead cols={['Modelo', 'NCM', 'CFOPs', 'Produtos', 'Situação', 'Ativo', '']} />
            <tbody>
              {rows.length === 0 && <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#ccc' }}>Nenhum modelo cadastrado</td></tr>}
              {rows.map((t) => (
                <tr key={t.id} style={{ borderBottom: '1px solid #f5f5f5', opacity: t.active ? 1 : .5 }}>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ fontWeight: 700, color: BRAND.navy }}>{t.name}</div>
                    {t.description && <div style={{ fontSize: 11, color: '#aaa' }}>{t.description}</div>}
                  </td>
                  <td style={{ padding: '10px 16px', fontFamily: 'monospace' }}>{t.data.ncm || '—'}</td>
                  <td style={{ padding: '10px 16px', fontFamily: 'monospace' }}>{t.data.cfops.map((c) => c.cfop).join(', ') || '—'}</td>
                  <td style={{ padding: '10px 16px' }}>{t.itemCount}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span title={t.byCfop.flatMap((b) => b.issues.filter((i) => i.severity === 'error').map((i) => `${b.cfop}: ${i.message}`)).join('\n')}
                      style={{ fontWeight: 800, fontSize: 12, color: t.complete ? BRAND.green : BRAND.red }}>
                      {t.complete ? 'Completo' : 'Incompleto'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px' }}><input type="checkbox" checked={t.active} onChange={() => toggleActive(t)} /></td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <Btn small variant="ghost" onClick={() => open(toForm(t))}>Editar</Btn>{' '}
                    <Btn small variant="ghost" onClick={() => open(toForm(t, true))}>Duplicar</Btn>{' '}
                    <Btn small variant="ghost" onClick={() => remove(t)}>Excluir</Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {form && (
        <ModalShell title={form.id ? 'Dados fiscais — editar modelo' : 'Dados fiscais — novo modelo'} width={900} onClose={() => setForm(null)}>
          {/* Cabeçalho (sempre visível, como no sistema de referência) */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0 18px' }}>
            <Field label="Descrição *"><input value={form.name} maxLength={120} autoFocus onChange={(e) => set({ name: e.target.value })} placeholder="Ex.: Alcoólicos" style={inputStyle} /></Field>
            <Field label="Unidade comercial"><input value={form.unidadeComercial} maxLength={6} onChange={(e) => set({ unidadeComercial: e.target.value })} style={inputStyle} /></Field>
            <Field label="Código benefício fiscal"><input value={form.codigoBeneficio} maxLength={10} onChange={(e) => set({ codigoBeneficio: e.target.value })} style={inputStyle} /></Field>
            <Field label="Código crédito presumido"><input value={form.creditoCodigo} maxLength={10} onChange={(e) => set({ creditoCodigo: e.target.value })} style={inputStyle} /></Field>
            <Field label="Percentual crédito presumido"><input type="number" step="any" min={0} value={form.creditoPercentual} onChange={(e) => set({ creditoPercentual: e.target.value })} style={inputStyle} /></Field>
            <Field label="Observação interna (opcional)"><input value={form.description} maxLength={300} onChange={(e) => set({ description: e.target.value })} style={inputStyle} /></Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0 18px' }}>
            <Field label="NCM * (8 dígitos)"><input value={form.ncm} maxLength={10} onChange={(e) => set({ ncm: e.target.value })} placeholder="2206.00.90" style={inputStyle} /></Field>
            <Field label="Origem da mercadoria *">
              <Sel value={form.origem} onChange={(x) => set({ origem: x })} options={Object.entries(ORIGENS).map(([c, l]) => [c, `${c} — ${l}`])} />
            </Field>
          </div>

          {/* Abas */}
          <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e5e7eb', margin: '4px 0 16px' }}>
            {([['impostos', 'IMPOSTOS'], ['cfops', `CFOPS (${form.cfops.length})`], ['cest', 'CEST']] as Array<[Tab, string]>).map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} style={{
                background: 'none', border: 'none', padding: '10px 16px', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
                color: tab === id ? BRAND.navy : '#9ca3af', borderBottom: tab === id ? `3px solid ${BRAND.orange}` : '3px solid transparent',
              }}>{label}</button>
            ))}
          </div>

          {tab === 'impostos' && (
            <div>
              <Section title="ICMS">
                <Num label="Redução da base (%)" value={form.icmsReducao} onChange={(x) => set({ icmsReducao: x })} />
                <Num label="Alíquota (%)" value={form.icmsAliquota} onChange={(x) => set({ icmsAliquota: x })} />
                <div style={{ width: 240 }}><label style={labelStyle}>Modalidade da base</label>
                  <Sel value={form.icmsModalidade} onChange={(x) => set({ icmsModalidade: x })} options={Object.entries(MOD_BC)} /></div>
                <Num label="FCP (%)" value={form.icmsFcp} onChange={(x) => set({ icmsFcp: x })} />
                <Num label="Alíquota crédito Simples (%)" value={form.icmsCreditoSimples} onChange={(x) => set({ icmsCreditoSimples: x })} width={190} />
              </Section>
              <Section title="ICMS ST">
                <Num label="Redução da base (%)" value={form.stReducao} onChange={(x) => set({ stReducao: x })} />
                <Num label="Alíquota (%)" value={form.stAliquota} onChange={(x) => set({ stAliquota: x })} />
                <div style={{ width: 240 }}><label style={labelStyle}>Modalidade da base</label>
                  <Sel value={form.stModalidade} onChange={(x) => set({ stModalidade: x })} options={Object.entries(MOD_BC_ST)} /></div>
                <Num label="MVA (%)" value={form.stMva} onChange={(x) => set({ stMva: x })} />
                <Num label="FCP ST (%)" value={form.stFcp} onChange={(x) => set({ stFcp: x })} />
              </Section>
              <Section title="Outros impostos">
                <Num label="Alíquota PIS (%)" value={form.pisAliquota} onChange={(x) => set({ pisAliquota: x })} />
                <Num label="Alíquota COFINS (%)" value={form.cofinsAliquota} onChange={(x) => set({ cofinsAliquota: x })} />
              </Section>
              <Section title="IBS / CBS (Reforma Tributária)">
                <div style={{ width: 150 }}><label style={labelStyle}>CST</label>
                  <Sel value={form.ibsSituacao} onChange={(x) => set({ ibsSituacao: x })} options={IBS_CBS_CST.map((c) => [c, c] as [string, string])} /></div>
                <div style={{ width: 170 }}><label style={labelStyle}>Classificação (cClassTrib)</label>
                  <input value={form.ibsClassificacao} maxLength={6} onChange={(e) => set({ ibsClassificacao: e.target.value })} style={inputStyle} /></div>
                <Num label="Alíquota IBS UF (%)" value={form.ibsUf} onChange={(x) => set({ ibsUf: x })} />
                <Num label="Alíquota IBS Mun. (%)" value={form.ibsMun} onChange={(x) => set({ ibsMun: x })} />
                <Num label="Alíquota CBS (%)" value={form.cbs} onChange={(x) => set({ cbs: x })} />
              </Section>
              <p style={{ fontSize: 11, color: '#888', margin: '0 0 10px' }}>
                Só são enviados os campos compatíveis com o CSOSN/CST do CFOP escolhido (ex.: alíquota de ICMS não é enviada em CSOSN 102/500).
                IPI não faz parte da NFC-e e, por isso, não é cadastrado.
              </p>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#666', margin: '6px 0' }}>Outros campos da Focus NFe (nome exato do campo)</div>
              <datalist id="fiscal-tpl-extra">{EXTRA_SUGGESTIONS.map((k) => <option key={k} value={k} />)}</datalist>
              {form.extra.map((row, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  <input list="fiscal-tpl-extra" value={row.k} placeholder="campo" style={{ ...inputStyle, flex: 2 }}
                    onChange={(e) => set({ extra: form.extra.map((x, j) => (j === i ? { ...x, k: e.target.value } : x)) })} />
                  <input value={row.v} placeholder="valor" style={{ ...inputStyle, flex: 1 }}
                    onChange={(e) => set({ extra: form.extra.map((x, j) => (j === i ? { ...x, v: e.target.value } : x)) })} />
                  <Btn small variant="ghost" onClick={() => set({ extra: form.extra.filter((_, j) => j !== i) })}>×</Btn>
                </div>
              ))}
              <Btn small variant="ghost" onClick={() => set({ extra: [...form.extra, { k: '', v: '' }] })}>+ campo</Btn>
            </div>
          )}

          {tab === 'cfops' && (
            <div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 14 }}>
                <div style={{ width: 200 }}><label style={labelStyle}>CFOP</label>
                  <input value={newCfop} maxLength={5} placeholder="Ex.: 5405" onChange={(e) => setNewCfop(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addCfop()} style={inputStyle} /></div>
                <Btn small onClick={addCfop}>+ Adicionar</Btn>
              </div>
              {form.cfops.length === 0 && <p style={{ fontSize: 13, color: '#aaa' }}>Nenhum CFOP. Adicione ao menos um — o produto escolhe qual usar.</p>}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', borderBottom: '1px solid #e5e7eb', marginBottom: 14 }}>
                {form.cfops.map((c, i) => (
                  <button key={c.cfop} onClick={() => setCfopSel(i)} style={{
                    background: 'none', border: 'none', padding: '8px 14px', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
                    color: cfopSel === i ? BRAND.navy : '#9ca3af', borderBottom: cfopSel === i ? `3px solid ${BRAND.orange}` : '3px solid transparent',
                  }}>{c.cfop}</button>
                ))}
              </div>
              {cf && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: '0 18px' }}>
                    <Field label="CSOSN / CST do ICMS *">
                      <select value={cf.icmsSituacao} onChange={(e) => patchCfop(cfopSel, { icmsSituacao: e.target.value })} style={inputStyle}>
                        <option value="">— selecione —</option>
                        <optgroup label="CSOSN — Simples Nacional">{ICMS_CSOSN.map((c) => <option key={c} value={c}>{c}</option>)}</optgroup>
                        <optgroup label="CST — regime normal">{ICMS_CST.map((c) => <option key={c} value={c}>{c}</option>)}</optgroup>
                      </select>
                    </Field>
                    <Field label="CST PIS *"><Sel value={cf.pisSituacao} onChange={(x) => patchCfop(cfopSel, { pisSituacao: x })} options={PIS_COFINS.map((c) => [c, c] as [string, string])} /></Field>
                    <Field label="CST COFINS *"><Sel value={cf.cofinsSituacao} onChange={(x) => patchCfop(cfopSel, { cofinsSituacao: x })} options={PIS_COFINS.map((c) => [c, c] as [string, string])} /></Field>
                  </div>
                  <Btn small variant="danger" onClick={() => { set({ cfops: form.cfops.filter((_, j) => j !== cfopSel) }); setCfopSel(0); }}>Remover CFOP {cf.cfop}</Btn>
                </div>
              )}
            </div>
          )}

          {tab === 'cest' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: '0 18px' }}>
                <Field label="CEST (7 dígitos)"><input value={form.cest} maxLength={9} placeholder="02.023.00" onChange={(e) => set({ cest: e.target.value })} style={inputStyle} /></Field>
              </div>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: '#444', cursor: form.cest.trim() ? 'pointer' : 'not-allowed', marginBottom: 12 }}>
                <input type="checkbox" checked={form.escalaRelevante} disabled={!form.cest.trim()}
                  onChange={(e) => set({ escalaRelevante: e.target.checked })} /> Produzido em escala relevante
              </label>
              <div style={{ width: 280 }}>
                <Field label="CNPJ do fabricante (se não for escala relevante)">
                  <input value={form.cnpjFabricante} maxLength={18} disabled={!form.cest.trim() || form.escalaRelevante}
                    onChange={(e) => set({ cnpjFabricante: e.target.value })} style={{ ...inputStyle, opacity: form.escalaRelevante ? .5 : 1 }} />
                </Field>
              </div>
              <p style={{ fontSize: 11, color: '#888' }}>
                O CEST é obrigatório para itens com ICMS-ST. A tabela oficial de CEST/NCM não é embutida no sistema: digite o código informado pelo contador.
              </p>
            </div>
          )}

          {err && <p style={{ color: BRAND.red, fontSize: 13, margin: '14px 0 0' }}>{err}</p>}
          {errList.length > 0 && <ul style={{ margin: '4px 0 0', paddingLeft: 18, fontSize: 12, color: BRAND.red }}>{errList.map((m) => <li key={m}>{m}</li>)}</ul>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center', marginTop: 18 }}>
            <label style={{ fontSize: 13, color: '#666', display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="checkbox" checked={form.active} onChange={(e) => set({ active: e.target.checked })} /> Modelo ativo
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <Btn variant="ghost" onClick={() => setForm(null)}>Cancelar</Btn>
              <Btn onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar modelo'}</Btn>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
