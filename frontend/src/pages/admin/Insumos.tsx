import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  insumosApi, fornecedoresApi, nfeImportApi,
  InsumoRow, FornecedorRow,
  UnidadeBase, UnidadeMedida, UnidadeInfo,
  NfePreviewResult, NfeItemPreview, NfeItemConfirmacao,
} from '@/services/api';
import { BRAND, Card, PageHeader, Btn, TableHead } from './shared';

// ── Helpers de exibição ──────────────────────────────────────────────────────

const UNIDADE_BASE_LABEL: Record<UnidadeBase, string> = {
  MG: 'Massa (kg/g/mg)', ML: 'Volume (L/ml)', UN: 'Contagem (unidades)',
};
const UNIDADE_BASE_SHORT: Record<UnidadeBase, string> = { MG: 'mg', ML: 'ml', UN: 'un' };

function formatEstoque(valorRaw: string | number | null | undefined, base: UnidadeBase): string {
  const v = parseFloat(String(valorRaw ?? 0)) || 0;
  if (base === 'MG') {
    if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} kg`;
    if (Math.abs(v) >= 1_000) return `${(v / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} g`;
    return `${v.toLocaleString('pt-BR')} mg`;
  }
  if (base === 'ML') {
    if (Math.abs(v) >= 1_000) return `${(v / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} L`;
    return `${v.toLocaleString('pt-BR')} ml`;
  }
  return `${v.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} un`;
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', border: '1.5px solid #dde', borderRadius: 8,
  padding: '9px 11px', fontSize: 13, outline: 'none', fontFamily: 'inherit',
};
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, color: '#666', marginBottom: 5 };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: 14 }}><label style={labelStyle}>{label}</label>{children}</div>;
}

function ModalShell({ title, width = 480, onClose, children }: { title: string; width?: number; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 200,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '24px 0' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width, maxWidth: '92vw',
        boxShadow: '0 20px 60px rgba(0,0,0,.25)', margin: 'auto 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: BRAND.navy }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: 22, lineHeight: 1, cursor: 'pointer', color: '#999' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function Insumos() {
  const [tab, setTab] = useState<'itens' | 'importar'>('itens');
  return (
    <div>
      <PageHeader
        title="Estoque de Insumos"
        subtitle="Cadastro de itens de estoque, marcas/fornecedores e conversão automática de unidades"
        action={(
          <div style={{ display: 'inline-flex', border: '1.5px solid #ddd', borderRadius: 8, overflow: 'hidden' }}>
            {(['itens', 'importar'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '8px 16px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
                background: tab === t ? BRAND.navy : '#fff', color: tab === t ? BRAND.yellow : '#666',
              }}>{t === 'itens' ? 'Itens de Estoque' : 'Importar NF-e'}</button>
            ))}
          </div>
        )}
      />
      {tab === 'itens' ? <ItensEstoqueTab /> : <ImportarNfeTab />}
    </div>
  );
}

// ── Aba: Itens de Estoque ─────────────────────────────────────────────────────

function ItensEstoqueTab() {
  const [insumos, setInsumos] = useState<InsumoRow[]>([]);
  const [fornecedores, setFornecedores] = useState<FornecedorRow[]>([]);
  const [unidades, setUnidades] = useState<Record<UnidadeMedida, UnidadeInfo>>({} as any);
  const [loading, setLoading] = useState(true);
  const [novoForm, setNovoForm] = useState<{ name: string; categoria: string; unidadeBase: UnidadeBase; estoqueMinimo: string } | null>(null);
  const [detalheId, setDetalheId] = useState<string | null>(null);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [i, f, u] = await Promise.all([insumosApi.list(), fornecedoresApi.list(), insumosApi.unidadesMedida()]);
      setInsumos(i); setFornecedores(f); setUnidades(u);
    } catch { /* noop */ }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function salvarNovo() {
    if (!novoForm) return;
    if (!novoForm.name.trim()) { setErr('Informe o nome do insumo.'); return; }
    try {
      const criado: any = await insumosApi.create({
        name: novoForm.name.trim(),
        categoria: novoForm.categoria.trim() || undefined,
        unidadeBase: novoForm.unidadeBase,
        estoqueMinimo: novoForm.estoqueMinimo ? parseFloat(novoForm.estoqueMinimo) : undefined,
      });
      setNovoForm(null); setErr('');
      await load();
      setDetalheId(criado.id);
    } catch (e: any) { setErr(e.message); }
  }

  const detalhe = insumos.find(i => i.id === detalheId) || null;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Btn onClick={() => setNovoForm({ name: '', categoria: '', unidadeBase: 'UN', estoqueMinimo: '' })}>+ Novo Insumo</Btn>
      </div>

      {loading ? <p style={{ color: '#aaa', fontSize: 13 }}>Carregando...</p> : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <TableHead cols={['Insumo', 'Categoria', 'Tipo de medida', 'Estoque atual', 'Estoque mínimo', 'Marcas/Fornecedores', '']} />
            <tbody>
              {insumos.length === 0 && (
                <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#ccc' }}>Nenhum insumo cadastrado</td></tr>
              )}
              {insumos.map(i => {
                const abaixoDoMinimo = i.estoqueMinimo != null && parseFloat(i.estoqueAtual) < parseFloat(i.estoqueMinimo);
                return (
                  <tr key={i.id} style={{ borderBottom: '1px solid #f5f5f5', opacity: i.active ? 1 : .5 }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: BRAND.navy }}>{i.name}</td>
                    <td style={{ padding: '12px 16px', color: '#888' }}>{i.categoria || '—'}</td>
                    <td style={{ padding: '12px 16px', color: '#888' }}>{UNIDADE_BASE_LABEL[i.unidadeBase]}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: abaixoDoMinimo ? BRAND.red : BRAND.navy }}>
                      {formatEstoque(i.estoqueAtual, i.unidadeBase)}
                      {abaixoDoMinimo && <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700 }}>⚠ abaixo do mínimo</span>}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#888' }}>{i.estoqueMinimo != null ? formatEstoque(i.estoqueMinimo, i.unidadeBase) : '—'}</td>
                    <td style={{ padding: '12px 16px', color: '#888' }}>{i.itensFornecedor?.length ?? 0}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <Btn small variant="ghost" onClick={() => setDetalheId(i.id)}>Detalhes</Btn>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {novoForm && (
        <ModalShell title="Novo Insumo" onClose={() => { setNovoForm(null); setErr(''); }}>
          <Field label="Nome do insumo">
            <input style={inputStyle} value={novoForm.name} onChange={e => setNovoForm({ ...novoForm, name: e.target.value })}
              placeholder="Ex: Arroz, Filé de Salmão, Molho Shoyu" />
          </Field>
          <Field label="Categoria (opcional)">
            <input style={inputStyle} value={novoForm.categoria} onChange={e => setNovoForm({ ...novoForm, categoria: e.target.value })}
              placeholder="Ex: Grãos, Peixes, Bebidas" />
          </Field>
          <Field label="Tipo de medida">
            <select style={inputStyle} value={novoForm.unidadeBase} onChange={e => setNovoForm({ ...novoForm, unidadeBase: e.target.value as UnidadeBase })}>
              {(Object.keys(UNIDADE_BASE_LABEL) as UnidadeBase[]).map(b => <option key={b} value={b}>{UNIDADE_BASE_LABEL[b]}</option>)}
            </select>
          </Field>
          <Field label="Estoque mínimo (opcional, alerta de reposição)">
            <input style={inputStyle} type="number" step="0.001" value={novoForm.estoqueMinimo}
              onChange={e => setNovoForm({ ...novoForm, estoqueMinimo: e.target.value })} />
          </Field>
          {err && <p style={{ color: BRAND.red, fontSize: 13, margin: '0 0 12px' }}>{err}</p>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => { setNovoForm(null); setErr(''); }}>Cancelar</Btn>
            <Btn onClick={salvarNovo}>Salvar e continuar</Btn>
          </div>
        </ModalShell>
      )}

      {detalhe && (
        <InsumoDetalheModal
          insumo={detalhe}
          fornecedores={fornecedores}
          unidades={unidades}
          onClose={() => setDetalheId(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}

// ── Modal de detalhe do insumo (edição, marcas/fornecedores, entrada manual) ──

function InsumoDetalheModal({ insumo, fornecedores, unidades, onClose, onChanged }: {
  insumo: InsumoRow; fornecedores: FornecedorRow[]; unidades: Record<UnidadeMedida, UnidadeInfo>;
  onClose: () => void; onChanged: () => Promise<void> | void;
}) {
  const [basic, setBasic] = useState({
    name: insumo.name, categoria: insumo.categoria || '',
    estoqueMinimo: insumo.estoqueMinimo != null ? String(insumo.estoqueMinimo) : '',
  });
  const [savingBasic, setSavingBasic] = useState(false);
  const [err, setErr] = useState('');

  const unidadesDaBase = useMemo(
    () => (Object.keys(unidades) as UnidadeMedida[]).filter(u => unidades[u]?.base === insumo.unidadeBase),
    [unidades, insumo.unidadeBase],
  );

  async function salvarBasic() {
    if (!basic.name.trim()) { setErr('Informe o nome do insumo.'); return; }
    setSavingBasic(true); setErr('');
    try {
      await insumosApi.update(insumo.id, {
        name: basic.name.trim(),
        categoria: basic.categoria.trim() || null,
        estoqueMinimo: basic.estoqueMinimo === '' ? null : parseFloat(basic.estoqueMinimo),
      });
      await onChanged();
    } catch (e: any) { setErr(e.message); }
    finally { setSavingBasic(false); }
  }

  async function inativar() {
    try { await insumosApi.remove(insumo.id); await onChanged(); onClose(); }
    catch (e: any) { setErr(e.message); }
  }

  return (
    <ModalShell title={`Insumo — ${insumo.name}`} width={700} onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
        <Field label="Nome"><input style={inputStyle} value={basic.name} onChange={e => setBasic({ ...basic, name: e.target.value })} /></Field>
        <Field label="Categoria"><input style={inputStyle} value={basic.categoria} onChange={e => setBasic({ ...basic, categoria: e.target.value })} /></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Estoque atual">
          <div style={{ ...inputStyle, background: '#f8f9fa', fontWeight: 700, color: BRAND.navy }}>
            {formatEstoque(insumo.estoqueAtual, insumo.unidadeBase)}
          </div>
        </Field>
        <Field label="Estoque mínimo">
          <input style={inputStyle} type="number" step="0.001" value={basic.estoqueMinimo}
            onChange={e => setBasic({ ...basic, estoqueMinimo: e.target.value })} />
        </Field>
      </div>
      {err && <p style={{ color: BRAND.red, fontSize: 13, margin: '0 0 12px' }}>{err}</p>}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', marginBottom: 24 }}>
        <Btn variant="danger" small onClick={inativar}>Inativar insumo</Btn>
        <Btn small onClick={salvarBasic} disabled={savingBasic}>{savingBasic ? 'Salvando...' : 'Salvar alterações'}</Btn>
      </div>

      <FornecedorItensSection insumo={insumo} fornecedores={fornecedores} unidadesDaBase={unidadesDaBase} unidades={unidades} onChanged={onChanged} />
      <EntradaManualSection insumo={insumo} onChanged={onChanged} />
    </ModalShell>
  );
}

// ── Seção: marcas / fornecedores do insumo ────────────────────────────────────

function FornecedorItensSection({ insumo, fornecedores, unidadesDaBase, unidades, onChanged }: {
  insumo: InsumoRow; fornecedores: FornecedorRow[]; unidadesDaBase: UnidadeMedida[];
  unidades: Record<UnidadeMedida, UnidadeInfo>; onChanged: () => Promise<void> | void;
}) {
  type Form = {
    id?: string; fornecedorId: string; marca: string; codigoFornecedor: string;
    unidadeCompra: UnidadeMedida; fatorConversao: string; ultimoPrecoUnitario: string;
  };
  const [form, setForm] = useState<Form | null>(null);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const exigeFator = form ? unidades[form.unidadeCompra]?.fatorFixo === null : false;

  async function salvar() {
    if (!form) return;
    setSaving(true); setErr('');
    try {
      const payload = {
        fornecedorId: form.fornecedorId || null,
        marca: form.marca.trim() || undefined,
        codigoFornecedor: form.codigoFornecedor.trim() || undefined,
        unidadeCompra: form.unidadeCompra,
        fatorConversao: form.fatorConversao ? parseFloat(form.fatorConversao) : undefined,
        ultimoPrecoUnitario: form.ultimoPrecoUnitario ? parseFloat(form.ultimoPrecoUnitario) : undefined,
      };
      if (form.id) await insumosApi.updateFornecedorItem(form.id, payload as any);
      else await insumosApi.addFornecedorItem(insumo.id, payload as any);
      setForm(null);
      await onChanged();
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  }

  async function remover(id: string) {
    try { await insumosApi.removeFornecedorItem(id); await onChanged(); }
    catch (e: any) { setErr(e.message); }
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: BRAND.navy }}>Marcas / Fornecedores</h3>
        <Btn small variant="secondary" onClick={() => setForm({
          fornecedorId: '', marca: '', codigoFornecedor: '', unidadeCompra: unidadesDaBase[0] ?? 'UN',
          fatorConversao: '', ultimoPrecoUnitario: '',
        })}>+ Adicionar</Btn>
      </div>

      <div style={{ border: '1px solid #eee', borderRadius: 10, overflow: 'hidden', marginBottom: form ? 14 : 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <TableHead cols={['Marca', 'Fornecedor', 'Unidade de compra', 'Equivale a', 'Últ. preço', '']} />
          <tbody>
            {(insumo.itensFornecedor || []).length === 0 && (
              <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#ccc' }}>Nenhuma marca/fornecedor cadastrada</td></tr>
            )}
            {(insumo.itensFornecedor || []).map(fi => (
              <tr key={fi.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                <td style={{ padding: '9px 12px' }}>{fi.marca || '—'}</td>
                <td style={{ padding: '9px 12px' }}>{fi.fornecedor?.nome || '—'}</td>
                <td style={{ padding: '9px 12px' }}>{unidades[fi.unidadeCompra]?.label || fi.unidadeCompra}</td>
                <td style={{ padding: '9px 12px' }}>1 {fi.unidadeCompra} = {fi.fatorConversao} {UNIDADE_BASE_SHORT[insumo.unidadeBase]}</td>
                <td style={{ padding: '9px 12px' }}>{fi.ultimoPrecoUnitario ? `R$ ${parseFloat(fi.ultimoPrecoUnitario).toFixed(2)}` : '—'}</td>
                <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>
                  <Btn small variant="ghost" onClick={() => setForm({
                    id: fi.id, fornecedorId: fi.fornecedorId || '', marca: fi.marca || '', codigoFornecedor: fi.codigoFornecedor || '',
                    unidadeCompra: fi.unidadeCompra, fatorConversao: String(fi.fatorConversao),
                    ultimoPrecoUnitario: fi.ultimoPrecoUnitario ? String(fi.ultimoPrecoUnitario) : '',
                  })}>Editar</Btn>{' '}
                  <Btn small variant="danger" onClick={() => remover(fi.id)}>Remover</Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <div style={{ background: '#f8f9fa', borderRadius: 10, padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Marca">
              <input style={inputStyle} value={form.marca} onChange={e => setForm({ ...form, marca: e.target.value })} placeholder="Ex: Camil, Sadia..." />
            </Field>
            <Field label="Fornecedor (opcional)">
              <select style={inputStyle} value={form.fornecedorId} onChange={e => setForm({ ...form, fornecedorId: e.target.value })}>
                <option value="">Nenhum</option>
                {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </Field>
            <Field label="Unidade de compra">
              <select style={inputStyle} value={form.unidadeCompra} onChange={e => setForm({ ...form, unidadeCompra: e.target.value as UnidadeMedida })}>
                {unidadesDaBase.map(u => <option key={u} value={u}>{unidades[u]?.label}</option>)}
              </select>
            </Field>
            <Field label="Código do fornecedor (opcional)">
              <input style={inputStyle} value={form.codigoFornecedor} onChange={e => setForm({ ...form, codigoFornecedor: e.target.value })} />
            </Field>
          </div>
          {exigeFator && (
            <Field label={`Quantas ${UNIDADE_BASE_SHORT[insumo.unidadeBase]} equivalem a 1 "${unidades[form.unidadeCompra]?.label}"?`}>
              <input style={inputStyle} type="number" step="0.0001" value={form.fatorConversao}
                onChange={e => setForm({ ...form, fatorConversao: e.target.value })} placeholder="Ex: 24" />
            </Field>
          )}
          <Field label="Último preço pago (opcional)">
            <input style={inputStyle} type="number" step="0.01" value={form.ultimoPrecoUnitario}
              onChange={e => setForm({ ...form, ultimoPrecoUnitario: e.target.value })} />
          </Field>
          {err && <p style={{ color: BRAND.red, fontSize: 13, margin: '8px 0 0' }}>{err}</p>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
            <Btn small variant="ghost" onClick={() => { setForm(null); setErr(''); }}>Cancelar</Btn>
            <Btn small onClick={salvar} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Seção: entrada manual de estoque ──────────────────────────────────────────

function EntradaManualSection({ insumo, onChanged }: { insumo: InsumoRow; onChanged: () => Promise<void> | void }) {
  const [fornecedorItemId, setFornecedorItemId] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [precoUnitario, setPrecoUnitario] = useState('');
  const [observacao, setObservacao] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  const itens = insumo.itensFornecedor || [];

  async function registrar() {
    setErr(''); setOk('');
    if (!fornecedorItemId) { setErr('Selecione a marca/fornecedor da compra.'); return; }
    const qtd = parseFloat(quantidade);
    if (!qtd || qtd <= 0) { setErr('Informe uma quantidade maior que zero.'); return; }
    setSaving(true);
    try {
      await insumosApi.registrarEntrada(insumo.id, {
        fornecedorItemId, quantidadeCompra: qtd,
        precoUnitario: precoUnitario ? parseFloat(precoUnitario) : undefined,
        observacao: observacao.trim() || undefined,
      });
      setQuantidade(''); setPrecoUnitario(''); setObservacao('');
      setOk('Entrada registrada com sucesso.');
      await onChanged();
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 800, color: BRAND.navy }}>Entrada Manual de Estoque</h3>
      {itens.length === 0 ? (
        <p style={{ fontSize: 12, color: '#aaa' }}>Cadastre ao menos uma marca/fornecedor acima para lançar uma entrada.</p>
      ) : (
        <div style={{ background: '#f8f9fa', borderRadius: 10, padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10 }}>
            <Field label="Marca / Fornecedor comprado">
              <select style={inputStyle} value={fornecedorItemId} onChange={e => setFornecedorItemId(e.target.value)}>
                <option value="">Selecione...</option>
                {itens.map(fi => (
                  <option key={fi.id} value={fi.id}>
                    {[fi.marca, fi.fornecedor?.nome].filter(Boolean).join(' — ') || 'Sem marca'} ({fi.unidadeCompra})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Quantidade comprada">
              <input style={inputStyle} type="number" step="0.001" value={quantidade} onChange={e => setQuantidade(e.target.value)} />
            </Field>
            <Field label="Preço unitário (opcional)">
              <input style={inputStyle} type="number" step="0.01" value={precoUnitario} onChange={e => setPrecoUnitario(e.target.value)} />
            </Field>
          </div>
          <Field label="Observação (opcional)">
            <input style={inputStyle} value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Ex: compra no mercado X" />
          </Field>
          {err && <p style={{ color: BRAND.red, fontSize: 13, margin: '0 0 10px' }}>{err}</p>}
          {ok && <p style={{ color: BRAND.green, fontSize: 13, margin: '0 0 10px' }}>{ok}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Btn small onClick={registrar} disabled={saving}>{saving ? 'Registrando...' : 'Registrar Entrada'}</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Aba: Importar NF-e ────────────────────────────────────────────────────────

type RowState = {
  item: NfeItemPreview;
  modo: 'vinculado' | 'existente' | 'novo';
  insumoId: string;
  novoNome: string;
  novaCategoria: string;
  novaUnidadeBase: UnidadeBase;
  novoEstoqueMinimo: string;
  unidadeCompra: UnidadeMedida;
  fatorConversao: string;
  marca: string;
};

function ImportarNfeTab() {
  const [xml, setXml] = useState('');
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<NfePreviewResult | null>(null);
  const [rows, setRows] = useState<RowState[]>([]);
  const [insumos, setInsumos] = useState<InsumoRow[]>([]);
  const [unidades, setUnidades] = useState<Record<UnidadeMedida, UnidadeInfo>>({} as any);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [err, setErr] = useState('');
  const [resultado, setResultado] = useState<{ itensProcessados: number } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [i, u] = await Promise.all([insumosApi.list(), insumosApi.unidadesMedida()]);
        setInsumos(i); setUnidades(u);
      } catch { /* noop */ }
    })();
  }, []);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setPreview(null); setRows([]); setResultado(null); setErr('');
    const reader = new FileReader();
    reader.onload = () => setXml(String(reader.result || ''));
    reader.readAsText(file, 'utf-8');
  }

  async function analisar() {
    if (!xml.trim()) { setErr('Selecione o arquivo XML da NF-e.'); return; }
    setLoadingPreview(true); setErr(''); setResultado(null);
    try {
      const p = await nfeImportApi.preview(xml);
      setPreview(p);
      setRows(p.itens.map((it): RowState => ({
        item: it,
        modo: it.vinculado ? 'vinculado' : 'existente',
        insumoId: it.insumoId || '',
        novoNome: it.descricao,
        novaCategoria: '',
        novaUnidadeBase: it.unidadeBaseInsumo || 'UN',
        novoEstoqueMinimo: '',
        unidadeCompra: it.unidadeSugerida || 'UN',
        fatorConversao: '',
        marca: '',
      })));
    } catch (e: any) { setErr(e.message); }
    finally { setLoadingPreview(false); }
  }

  function updateRow(idx: number, patch: Partial<RowState>) {
    setRows(rs => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  async function confirmar() {
    if (!preview) return;
    setErr('');
    const itens: NfeItemConfirmacao[] = [];
    for (const r of rows) {
      if (r.modo === 'vinculado') {
        itens.push({
          codigoFornecedor: r.item.codigoFornecedor, descricao: r.item.descricao, unidadeComercial: r.item.unidadeComercial,
          quantidade: r.item.quantidade, valorUnitario: r.item.valorUnitario,
          fornecedorItemId: r.item.fornecedorItemId, insumoId: r.item.insumoId,
        });
        continue;
      }
      const precisaFator = unidades[r.unidadeCompra]?.fatorFixo === null;
      if (r.modo === 'existente') {
        if (!r.insumoId) { setErr(`Selecione o insumo para "${r.item.descricao}" ou escolha "Criar novo insumo".`); return; }
        if (!r.unidadeCompra) { setErr(`Selecione a unidade de compra para "${r.item.descricao}".`); return; }
        if (precisaFator && !r.fatorConversao) {
          setErr(`Informe quantas unidades equivalem a 1 "${unidades[r.unidadeCompra]?.label}" para "${r.item.descricao}".`);
          return;
        }
        itens.push({
          codigoFornecedor: r.item.codigoFornecedor, descricao: r.item.descricao, unidadeComercial: r.item.unidadeComercial,
          quantidade: r.item.quantidade, valorUnitario: r.item.valorUnitario,
          insumoId: r.insumoId, unidadeCompra: r.unidadeCompra,
          fatorConversao: r.fatorConversao ? parseFloat(r.fatorConversao) : undefined,
          marca: r.marca || undefined,
        });
      } else {
        if (!r.novoNome.trim()) { setErr(`Informe o nome do novo insumo para "${r.item.descricao}".`); return; }
        if (!r.unidadeCompra) { setErr(`Selecione a unidade de compra para "${r.item.descricao}".`); return; }
        if (unidades[r.unidadeCompra]?.base !== r.novaUnidadeBase) {
          setErr(`A unidade de compra escolhida para "${r.item.descricao}" não é compatível com o tipo de medida do novo insumo.`);
          return;
        }
        if (precisaFator && !r.fatorConversao) {
          setErr(`Informe quantas unidades equivalem a 1 "${unidades[r.unidadeCompra]?.label}" para "${r.item.descricao}".`);
          return;
        }
        itens.push({
          codigoFornecedor: r.item.codigoFornecedor, descricao: r.item.descricao, unidadeComercial: r.item.unidadeComercial,
          quantidade: r.item.quantidade, valorUnitario: r.item.valorUnitario,
          criarInsumo: {
            name: r.novoNome.trim(), categoria: r.novaCategoria.trim() || undefined,
            unidadeBase: r.novaUnidadeBase, estoqueMinimo: r.novoEstoqueMinimo ? parseFloat(r.novoEstoqueMinimo) : undefined,
          },
          unidadeCompra: r.unidadeCompra,
          fatorConversao: r.fatorConversao ? parseFloat(r.fatorConversao) : undefined,
          marca: r.marca || undefined,
        });
      }
    }

    setConfirming(true);
    try {
      const res: any = await nfeImportApi.confirmar(xml, itens);
      setResultado(res);
      setPreview(null); setRows([]); setXml(''); setFileName('');
      const i = await insumosApi.list();
      setInsumos(i);
    } catch (e: any) { setErr(e.message); }
    finally { setConfirming(false); }
  }

  return (
    <div>
      <Card style={{ marginBottom: 20 }}>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: '#666' }}>
          Selecione o arquivo XML da NF-e (baixado do fornecedor ou do portal do destinatário). O sistema lê a chave de
          acesso, o fornecedor e os itens da nota — você confere e vincula cada item a um insumo do estoque antes de
          confirmar a entrada, com a conversão de unidades feita automaticamente.
        </p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{
            display: 'inline-block', padding: '10px 18px', borderRadius: 8, border: '1.5px dashed #ccc',
            fontSize: 13, fontWeight: 700, color: BRAND.navy, cursor: 'pointer',
          }}>
            {fileName || 'Escolher arquivo XML...'}
            <input type="file" accept=".xml,text/xml" onChange={onFile} style={{ display: 'none' }} />
          </label>
          <Btn onClick={analisar} disabled={!xml || loadingPreview}>{loadingPreview ? 'Analisando...' : 'Analisar XML'}</Btn>
        </div>
        {err && <p style={{ color: BRAND.red, fontSize: 13, margin: '12px 0 0' }}>{err}</p>}
        {resultado && (
          <p style={{ color: BRAND.green, fontSize: 13, margin: '12px 0 0', fontWeight: 700 }}>
            Importação concluída — {resultado.itensProcessados} item(ns) processado(s) e adicionados ao estoque.
          </p>
        )}
      </Card>

      {preview && (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 12, color: '#999' }}>Fornecedor</div>
              <div style={{ fontWeight: 800, color: BRAND.navy }}>{preview.fornecedor.nome || '—'}</div>
              <div style={{ fontSize: 12, color: '#999' }}>{preview.fornecedor.cnpj || 'CNPJ não informado'}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#999' }}>NF-e</div>
              <div style={{ fontWeight: 800, color: BRAND.navy }}>Nº {preview.numero || '—'} / Série {preview.serie || '—'}</div>
              <div style={{ fontSize: 12, color: '#999' }}>{preview.dataEmissao ? new Date(preview.dataEmissao).toLocaleString('pt-BR') : ''}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#999' }}>Valor total</div>
              <div style={{ fontWeight: 800, color: BRAND.navy }}>{preview.valorTotal != null ? `R$ ${preview.valorTotal.toFixed(2)}` : '—'}</div>
            </div>
          </div>

          {preview.jaImportada && (
            <div style={{ background: '#fff3f3', border: `1px solid ${BRAND.red}`, borderRadius: 8, padding: 12,
              marginBottom: 18, color: BRAND.red, fontSize: 13, fontWeight: 700 }}>
              Esta NF-e (chave {preview.chaveAcesso}) já foi importada anteriormente e não pode ser lançada de novo.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {rows.map((r, idx) => (
              <ItemNfeRow key={idx} row={r} insumos={insumos} unidades={unidades} onChange={patch => updateRow(idx, patch)} />
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
            <Btn onClick={confirmar} disabled={confirming || preview.jaImportada}>
              {confirming ? 'Confirmando...' : 'Confirmar Importação'}
            </Btn>
          </div>
        </Card>
      )}
    </div>
  );
}

function ItemNfeRow({ row, insumos, unidades, onChange }: {
  row: RowState; insumos: InsumoRow[]; unidades: Record<UnidadeMedida, UnidadeInfo>;
  onChange: (patch: Partial<RowState>) => void;
}) {
  const insumoSelecionado = insumos.find(i => i.id === row.insumoId);
  const baseAtual = row.modo === 'novo' ? row.novaUnidadeBase : insumoSelecionado?.unidadeBase;
  const todasUnidades = Object.keys(unidades) as UnidadeMedida[];
  const unidadesCompativeis = baseAtual ? todasUnidades.filter(u => unidades[u]?.base === baseAtual) : todasUnidades;
  const exigeFator = unidades[row.unidadeCompra]?.fatorFixo === null;

  return (
    <div style={{ border: '1px solid #eee', borderRadius: 10, padding: 16, background: row.item.vinculado ? '#f4fff6' : '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontWeight: 800, color: BRAND.navy, fontSize: 14 }}>{row.item.descricao}</div>
          <div style={{ fontSize: 12, color: '#999' }}>
            Código {row.item.codigoFornecedor || '—'} · {row.item.quantidade} {row.item.unidadeComercial} × R$ {row.item.valorUnitario.toFixed(2)} = R$ {row.item.valorTotal.toFixed(2)}
          </div>
        </div>
        {row.item.vinculado && (
          <div style={{ fontSize: 12, fontWeight: 700, color: BRAND.green }}>✓ Vinculado a "{row.item.insumoNome}"</div>
        )}
      </div>

      {!row.item.vinculado && (
        <>
          <div style={{ display: 'inline-flex', border: '1.5px solid #ddd', borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
            {(['existente', 'novo'] as const).map(m => (
              <button key={m} onClick={() => onChange({ modo: m })} style={{
                padding: '6px 14px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
                background: row.modo === m ? BRAND.navy : '#fff', color: row.modo === m ? BRAND.yellow : '#666',
              }}>{m === 'existente' ? 'Vincular a insumo existente' : 'Criar novo insumo'}</button>
            ))}
          </div>

          {row.modo === 'existente' ? (
            <Field label="Insumo">
              <select style={inputStyle} value={row.insumoId} onChange={e => onChange({ insumoId: e.target.value })}>
                <option value="">Selecione...</option>
                {insumos.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </Field>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10 }}>
              <Field label="Nome do novo insumo">
                <input style={inputStyle} value={row.novoNome} onChange={e => onChange({ novoNome: e.target.value })} />
              </Field>
              <Field label="Categoria (opcional)">
                <input style={inputStyle} value={row.novaCategoria} onChange={e => onChange({ novaCategoria: e.target.value })} />
              </Field>
              <Field label="Tipo de medida">
                <select style={inputStyle} value={row.novaUnidadeBase}
                  onChange={e => onChange({ novaUnidadeBase: e.target.value as UnidadeBase, unidadeCompra: 'UN' as UnidadeMedida, fatorConversao: '' })}>
                  <option value="MG">Massa (kg/g/mg)</option>
                  <option value="ML">Volume (L/ml)</option>
                  <option value="UN">Contagem (un)</option>
                </select>
              </Field>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: exigeFator ? '1fr 1fr 1fr' : '1fr 1fr', gap: 10, marginTop: 10 }}>
            <Field label="Unidade de compra (nesta nota)">
              <select style={inputStyle} value={row.unidadeCompra} onChange={e => onChange({ unidadeCompra: e.target.value as UnidadeMedida })}>
                {unidadesCompativeis.map(u => <option key={u} value={u}>{unidades[u]?.label}</option>)}
              </select>
            </Field>
            {exigeFator && (
              <Field label="Quantas unidades-base equivalem a 1?">
                <input style={inputStyle} type="number" step="0.0001" placeholder="Ex: 24"
                  value={row.fatorConversao} onChange={e => onChange({ fatorConversao: e.target.value })} />
              </Field>
            )}
            <Field label="Marca (opcional)">
              <input style={inputStyle} value={row.marca} onChange={e => onChange({ marca: e.target.value })} />
            </Field>
          </div>
        </>
      )}
    </div>
  );
}
