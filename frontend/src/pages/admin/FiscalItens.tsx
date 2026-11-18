import { useEffect, useMemo, useState } from 'react';
import { fiscalApi, FiscalItemData, FiscalItemRow, FiscalTemplate } from '@/services/api';
import { BRAND, Card, PageHeader, Btn, Field, ModalShell, TableHead, inputStyle } from './shared';
import { ICMS_CST, ICMS_CSOSN, PIS_COFINS, IBS_CBS_CST, ORIGENS } from './fiscalOptions';

// Campos extras mais comuns (Focus NFe). Outros nomes podem ser digitados — a lista só sugere.
const EXTRA_SUGGESTIONS = [
  'icms_modalidade_base_calculo', 'icms_aliquota', 'icms_reducao_base_calculo', 'icms_aliquota_credito_simples',
  'icms_modalidade_base_calculo_st', 'icms_margem_valor_adicionado_st', 'icms_aliquota_st',
  'icms_motivo_desoneracao', 'fcp_percentual',
  'pis_aliquota_porcentual', 'pis_quantidade_vendida', 'pis_aliquota_valor',
  'cofins_aliquota_porcentual', 'cofins_quantidade_vendida', 'cofins_aliquota_valor',
  'ibs_uf_aliquota', 'ibs_mun_aliquota', 'cbs_aliquota', 'ibs_cbs_indicacao_doacao',
];

const STATUS: Record<string, { label: string; color: string }> = {
  ok:       { label: 'Completo',  color: BRAND.green },
  atencao:  { label: 'Atenção',   color: BRAND.orange },
  pendente: { label: 'Pendente',  color: BRAND.red },
};

type Form = {
  ncm: string; cest: string; cfop: string; unidadeComercial: string; icmsOrigem: string; icmsSituacao: string;
  pisSituacao: string; cofinsSituacao: string; codigoBeneficio: string; ibsCbsSituacao: string; ibsCbsClassificacao: string;
  extra: Array<{ k: string; v: string }>;
  structured: Record<string, any>; // extras não simples (ex.: infos_credito_presumido) — preservados, não editáveis aqui
};

const toForm = (f: FiscalItemData): Form => {
  const simple: Array<{ k: string; v: string }> = []; const structured: Record<string, any> = {};
  for (const [k, v] of Object.entries(f.extra ?? {})) {
    if (v !== null && typeof v === 'object') structured[k] = v; else simple.push({ k, v: String(v) });
  }
  return {
    ncm: f.ncm ?? '', cest: f.cest ?? '', cfop: f.cfop ?? '', unidadeComercial: f.unidadeComercial ?? 'UN',
    icmsOrigem: f.icmsOrigem ?? '', icmsSituacao: f.icmsSituacao ?? '', pisSituacao: f.pisSituacao ?? '',
    cofinsSituacao: f.cofinsSituacao ?? '', codigoBeneficio: f.codigoBeneficio ?? '',
    ibsCbsSituacao: f.ibsCbsSituacao ?? '', ibsCbsClassificacao: f.ibsCbsClassificacao ?? '',
    extra: simple, structured,
  };
};

export default function FiscalItens() {
  const [rows, setRows]   = useState<FiscalItemRow[]>([]);
  const [templates, setTemplates] = useState<FiscalTemplate[]>([]);
  const [stats, setStats] = useState({ total: 0, pendentes: 0, atencao: 0 });
  const [loading, setLoading] = useState(true);
  const [onlyPending, setOnlyPending] = useState(false);
  const [q, setQ]         = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulk, setBulk]   = useState({ templateId: '', cfop: '' });
  const [edit, setEdit]   = useState<{ row: FiscalItemRow; form: Form } | null>(null);
  const [pick, setPick]   = useState({ templateId: '', cfop: '' }); // seleção de modelo no modal
  const [saving, setSaving] = useState(false);
  const [err, setErr]     = useState('');
  const [errList, setErrList] = useState<string[]>([]);
  const [ok, setOk]       = useState('');

  async function load() {
    setLoading(true);
    try {
      const [d, t] = await Promise.all([fiscalApi.items(false), fiscalApi.templates()]);
      setRows(d.items); setTemplates(t);
      setStats({ total: d.total, pendentes: d.pendentes, atencao: d.atencao }); setErr('');
      return d.items;
    } catch (e: any) { setErr(e.message); return null; }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  const shown = useMemo(() => rows
    .filter((r) => !onlyPending || r.status !== 'ok')
    .filter((r) => !q.trim() || r.name.toLowerCase().includes(q.trim().toLowerCase())), [rows, onlyPending, q]);

  const activeTemplates = templates.filter((t) => t.active);
  const tplById = (id: string) => templates.find((t) => t.id === id);
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allShownSelected = shown.length > 0 && shown.every((r) => selected.has(r.id));

  async function applyBulk() {
    if (!bulk.templateId || !selected.size) return;
    const tpl = tplById(bulk.templateId);
    if (!window.confirm(`Aplicar o modelo "${tpl?.name}" a ${selected.size} produto(s)? Os dados fiscais atuais deles serão substituídos.`)) return;
    setErr(''); setOk('');
    try {
      const r = await fiscalApi.applyTemplate({ templateId: bulk.templateId, itemIds: [...selected], cfop: bulk.cfop || null });
      setOk(`Modelo aplicado a ${r.applied} produto(s).`); setSelected(new Set()); await load();
    } catch (e: any) { setErr(e.message); }
  }

  function openEdit(r: FiscalItemRow) {
    setErr(''); setErrList([]); setOk('');
    setPick({ templateId: r.template?.id ?? '', cfop: r.template?.cfop ?? '' });
    setEdit({ row: r, form: toForm(r.fiscal) });
  }

  async function reopen(id: string) {
    const items = await load();
    const r = items?.find((x) => x.id === id);
    if (r) openEdit(r); else setEdit(null);
  }

  async function applyInModal() {
    if (!edit || !pick.templateId) return;
    setSaving(true); setErr('');
    try {
      await fiscalApi.applyTemplate({ templateId: pick.templateId, itemIds: [edit.row.id], cfop: pick.cfop || null });
      await reopen(edit.row.id);
    } catch (e: any) { setErr(e.message); setErrList((e.errors ?? []).map((x: any) => x.message)); }
    finally { setSaving(false); }
  }

  async function unlink() {
    if (!edit) return;
    setSaving(true); setErr('');
    try {
      await fiscalApi.applyTemplate({ templateId: null, itemIds: [edit.row.id] });
      await reopen(edit.row.id);
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  }

  async function save() {
    if (!edit) return;
    const f = edit.form;
    const extra: Record<string, any> = { ...f.structured };
    for (const { k, v } of f.extra) if (k.trim() && v.trim()) extra[k.trim()] = v.trim().replace(',', '.');
    setSaving(true); setErr(''); setErrList([]);
    try {
      await fiscalApi.saveItem(edit.row.id, {
        ncm: f.ncm, cest: f.cest, cfop: f.cfop, unidadeComercial: f.unidadeComercial, icmsOrigem: f.icmsOrigem,
        icmsSituacao: f.icmsSituacao, pisSituacao: f.pisSituacao, cofinsSituacao: f.cofinsSituacao,
        codigoBeneficio: f.codigoBeneficio, ibsCbsSituacao: f.ibsCbsSituacao, ibsCbsClassificacao: f.ibsCbsClassificacao,
        extra,
      });
      setEdit(null); await load();
    } catch (e: any) { setErr(e.message); setErrList((e.errors ?? []).map((x: any) => x.message)); }
    finally { setSaving(false); }
  }

  const set = (patch: Partial<Form>) => edit && setEdit({ ...edit, form: { ...edit.form, ...patch } });
  const linked = !!edit?.row.template;
  const dis = linked ? { disabled: true } : {};
  const Sel = ({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} {...dis}>
      <option value="">— não informado —</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );

  const bulkTpl = tplById(bulk.templateId);
  const pickTpl = tplById(pick.templateId);

  return (
    <div>
      <PageHeader title="Fiscal — Classificação dos produtos"
        subtitle="Dados fiscais de cada item do cardápio, usados na emissão da NFC-e" />

      <div style={{ background:'#FFF8E1', border:'1px solid #FFD60A', borderRadius:10, padding:'10px 14px', fontSize:12, color:'#7a5b00', marginBottom:16 }}>
        Escolha o <b>modelo</b> (cadastrado em <b>Fiscal › Dados fiscais</b>) de cada produto ou de vários de uma vez. Nenhum código é sugerido nem
        preenchido automaticamente e não existe tributação genérica. Itens com pendência obrigatória <b>não são emitidos</b>.
      </div>

      {stats.pendentes > 0 && (
        <div style={{ background:'#E6394614', border:`1px solid ${BRAND.red}`, borderRadius:10, padding:'10px 14px', fontSize:13, color:BRAND.red, fontWeight:700, marginBottom:16 }}>
          {stats.pendentes} de {stats.total} produtos sem classificação fiscal completa — a NFC-e das comandas que os contêm não será emitida.
        </div>
      )}

      <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:12, flexWrap:'wrap' }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar produto" style={{ ...inputStyle, width:240 }} />
        <label style={{ fontSize:13, color:'#555', display:'flex', gap:6, alignItems:'center', cursor:'pointer' }}>
          <input type="checkbox" checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} /> Só com pendência
        </label>
      </div>

      {/* Aplicação em lote */}
      <Card style={{ padding:'12px 16px', marginBottom:14, background: selected.size ? '#FFFBEA' : '#fff' }}>
        <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', fontSize:13 }}>
          <b style={{ color:BRAND.navy }}>{selected.size} selecionado(s)</b>
          <select value={bulk.templateId} onChange={(e) => setBulk({ templateId: e.target.value, cfop: '' })} style={{ ...inputStyle, width:250 }}>
            <option value="">Aplicar modelo…</option>
            {activeTemplates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          {bulkTpl && bulkTpl.data.cfops.length > 1 && (
            <select value={bulk.cfop} onChange={(e) => setBulk({ ...bulk, cfop: e.target.value })} style={{ ...inputStyle, width:150 }}>
              <option value="">CFOP: {bulkTpl.data.cfops[0].cfop} (padrão)</option>
              {bulkTpl.data.cfops.map((c) => <option key={c.cfop} value={c.cfop}>CFOP {c.cfop}</option>)}
            </select>
          )}
          <Btn small disabled={!bulk.templateId || !selected.size} onClick={applyBulk}>Aplicar aos selecionados</Btn>
          {activeTemplates.length === 0 && <span style={{ color:'#aaa', fontSize:12 }}>Nenhum modelo ativo — cadastre em Fiscal › Dados fiscais.</span>}
        </div>
      </Card>

      {err && !edit && <p style={{ color:BRAND.red, fontSize:13 }}>{err}</p>}
      {ok && <p style={{ color:BRAND.green, fontSize:13, fontWeight:700 }}>{ok}</p>}
      {loading ? <p style={{ color:'#aaa', fontSize:13 }}>Carregando...</p> : (
        <Card style={{ padding:0, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:'#f8f9fa' }}>
                <th style={{ padding:'10px 16px', width:30 }}>
                  <input type="checkbox" checked={allShownSelected}
                    onChange={() => setSelected(allShownSelected ? new Set() : new Set(shown.map((r) => r.id)))} />
                </th>
                {['Produto', 'Modelo', 'NCM', 'CFOP', 'ICMS', 'PIS/COFINS', 'Situação', ''].map((h) => (
                  <th key={h} style={{ textAlign:'left', padding:'10px 16px', fontSize:11, color:'#888', fontWeight:700, textTransform:'uppercase', letterSpacing:.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 && <tr><td colSpan={9} style={{ padding:40, textAlign:'center', color:'#ccc' }}>Nenhum produto</td></tr>}
              {shown.map((r) => {
                const st = STATUS[r.status];
                return (
                  <tr key={r.id} style={{ borderBottom:'1px solid #f5f5f5', opacity: r.available ? 1 : .55 }}>
                    <td style={{ padding:'10px 16px' }}><input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} /></td>
                    <td style={{ padding:'10px 16px' }}>
                      <div style={{ fontWeight:700, color:BRAND.navy }}>{r.name}</div>
                      <div style={{ fontSize:11, color:'#aaa' }}>{r.category}</div>
                    </td>
                    <td style={{ padding:'10px 16px', fontSize:12 }}>
                      {r.template ? <span style={{ fontWeight:700, color:BRAND.navy }}>{r.template.name}</span> : <span style={{ color:'#bbb' }}>manual</span>}
                    </td>
                    <td style={{ padding:'10px 16px', fontFamily:'monospace' }}>{r.fiscal.ncm ?? '—'}</td>
                    <td style={{ padding:'10px 16px', fontFamily:'monospace' }}>{r.fiscal.cfop ?? '—'}</td>
                    <td style={{ padding:'10px 16px', fontFamily:'monospace' }}>{r.fiscal.icmsSituacao ?? '—'}</td>
                    <td style={{ padding:'10px 16px', fontFamily:'monospace' }}>{r.fiscal.pisSituacao ?? '—'}/{r.fiscal.cofinsSituacao ?? '—'}</td>
                    <td style={{ padding:'10px 16px' }}>
                      <span title={r.issues.map((i) => i.message).join('\n')} style={{ fontWeight:800, color:st.color, fontSize:12 }}>
                        {st.label}{r.issues.length ? ` (${r.issues.length})` : ''}
                      </span>
                    </td>
                    <td style={{ padding:'10px 16px', textAlign:'right' }}>
                      <Btn small variant="ghost" onClick={() => openEdit(r)}>Editar</Btn>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {edit && (
        <ModalShell title={`Dados fiscais — ${edit.row.name}`} width={720} onClose={() => setEdit(null)}>
          {/* Modelo fiscal */}
          <div style={{ background:'#f8f9fa', border:'1px solid #e5e7eb', borderRadius:10, padding:'12px 14px', marginBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:800, color:BRAND.navy, marginBottom:8 }}>Modelo fiscal</div>
            {linked ? (
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                <div style={{ fontSize:13 }}>
                  Usando o modelo <b>{edit.row.template!.name}</b>{edit.row.template!.cfop ? <> · CFOP <b>{edit.row.template!.cfop}</b></> : null}.
                  <div style={{ fontSize:11, color:'#888' }}>Os campos abaixo vêm do modelo. Para mudar, edite o modelo ou desvincule o produto.</div>
                </div>
                <Btn small variant="ghost" onClick={unlink} disabled={saving}>Desvincular (editar manualmente)</Btn>
              </div>
            ) : (
              <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
                <select value={pick.templateId} onChange={(e) => setPick({ templateId: e.target.value, cfop: '' })} style={{ ...inputStyle, width:260 }}>
                  <option value="">— Classificação manual (sem modelo) —</option>
                  {activeTemplates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                {pickTpl && pickTpl.data.cfops.length > 1 && (
                  <select value={pick.cfop} onChange={(e) => setPick({ ...pick, cfop: e.target.value })} style={{ ...inputStyle, width:160 }}>
                    <option value="">CFOP {pickTpl.data.cfops[0].cfop} (padrão)</option>
                    {pickTpl.data.cfops.map((c) => <option key={c.cfop} value={c.cfop}>CFOP {c.cfop}</option>)}
                  </select>
                )}
                <Btn small disabled={!pick.templateId || saving} onClick={applyInModal}>Aplicar modelo</Btn>
              </div>
            )}
          </div>

          {edit.row.issues.length > 0 && (
            <ul style={{ margin:'0 0 14px', paddingLeft:18, fontSize:12 }}>
              {edit.row.issues.map((i, k) => <li key={k} style={{ color: i.severity === 'error' ? BRAND.red : BRAND.orange }}>{i.message}</li>)}
            </ul>
          )}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'0 16px' }}>
            <Field label="NCM (8 dígitos)"><input value={edit.form.ncm} maxLength={10} onChange={(e) => set({ ncm: e.target.value })} style={inputStyle} {...dis} /></Field>
            <Field label="CEST (7 dígitos, se houver ST)"><input value={edit.form.cest} maxLength={9} onChange={(e) => set({ cest: e.target.value })} style={inputStyle} {...dis} /></Field>
            <Field label="CFOP (4 dígitos)"><input value={edit.form.cfop} maxLength={4} onChange={(e) => set({ cfop: e.target.value })} style={inputStyle} {...dis} /></Field>
            <Field label="Unidade comercial"><input value={edit.form.unidadeComercial} maxLength={6} onChange={(e) => set({ unidadeComercial: e.target.value })} style={inputStyle} {...dis} /></Field>
            <Field label="Origem da mercadoria">
              <select value={edit.form.icmsOrigem} onChange={(e) => set({ icmsOrigem: e.target.value })} style={inputStyle} {...dis}>
                <option value="">— não informado —</option>
                {Object.entries(ORIGENS).map(([c, l]) => <option key={c} value={c}>{c} — {l}</option>)}
              </select>
            </Field>
            <Field label="Situação tributária do ICMS (CST ou CSOSN)">
              <select value={edit.form.icmsSituacao} onChange={(e) => set({ icmsSituacao: e.target.value })} style={inputStyle} {...dis}>
                <option value="">— não informado —</option>
                <optgroup label="CST — regime normal">{ICMS_CST.map((c) => <option key={c} value={c}>{c}</option>)}</optgroup>
                <optgroup label="CSOSN — Simples Nacional">{ICMS_CSOSN.map((c) => <option key={c} value={c}>{c}</option>)}</optgroup>
              </select>
            </Field>
            <Field label="CST do PIS"><Sel value={edit.form.pisSituacao} onChange={(v) => set({ pisSituacao: v })} options={PIS_COFINS} /></Field>
            <Field label="CST da COFINS"><Sel value={edit.form.cofinsSituacao} onChange={(v) => set({ cofinsSituacao: v })} options={PIS_COFINS} /></Field>
            <Field label="Código de benefício fiscal (opcional)"><input value={edit.form.codigoBeneficio} maxLength={10} onChange={(e) => set({ codigoBeneficio: e.target.value })} style={inputStyle} {...dis} /></Field>
            <Field label="IBS/CBS — CST (opcional)"><Sel value={edit.form.ibsCbsSituacao} onChange={(v) => set({ ibsCbsSituacao: v })} options={IBS_CBS_CST} /></Field>
            <Field label="IBS/CBS — classificação (cClassTrib, 6 dígitos)"><input value={edit.form.ibsCbsClassificacao} maxLength={6} onChange={(e) => set({ ibsCbsClassificacao: e.target.value })} style={inputStyle} {...dis} /></Field>
          </div>

          <div style={{ fontSize:12, fontWeight:700, color:'#666', margin:'6px 0 6px' }}>
            Campos adicionais (alíquotas, modalidade, ST…) — nome exato do campo na Focus NFe
          </div>
          <datalist id="fiscal-extra-keys">{EXTRA_SUGGESTIONS.map((k) => <option key={k} value={k} />)}</datalist>
          {edit.form.extra.map((row, i) => (
            <div key={i} style={{ display:'flex', gap:8, marginBottom:6 }}>
              <input list="fiscal-extra-keys" value={row.k} placeholder="ex.: icms_aliquota" style={{ ...inputStyle, flex:2 }} {...dis}
                onChange={(e) => set({ extra: edit.form.extra.map((x, j) => j === i ? { ...x, k: e.target.value } : x) })} />
              <input value={row.v} placeholder="valor (use ponto)" style={{ ...inputStyle, flex:1 }} {...dis}
                onChange={(e) => set({ extra: edit.form.extra.map((x, j) => j === i ? { ...x, v: e.target.value } : x) })} />
              {!linked && <Btn small variant="ghost" onClick={() => set({ extra: edit.form.extra.filter((_, j) => j !== i) })}>×</Btn>}
            </div>
          ))}
          {Object.keys(edit.form.structured).map((k) => (
            <div key={k} style={{ fontSize:12, color:'#888', marginBottom:4 }}>
              <code>{k}</code>: {JSON.stringify(edit.form.structured[k])} <i>(definido pelo modelo/cadastro; preservado)</i>
            </div>
          ))}
          {!linked && <Btn small variant="ghost" onClick={() => set({ extra: [...edit.form.extra, { k: '', v: '' }] })}>+ campo</Btn>}

          {err && <p style={{ color:BRAND.red, fontSize:13, margin:'12px 0 0' }}>{err}</p>}
          {errList.length > 0 && <ul style={{ margin:'4px 0 0', paddingLeft:18, fontSize:12, color:BRAND.red }}>{errList.map((m, i) => <li key={i}>{m}</li>)}</ul>}
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:18 }}>
            <Btn variant="ghost" onClick={() => setEdit(null)}>{linked ? 'Fechar' : 'Cancelar'}</Btn>
            {!linked && <Btn onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Btn>}
          </div>
        </ModalShell>
      )}
    </div>
  );
}
