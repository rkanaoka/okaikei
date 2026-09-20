/**
 * Gerar Código de Barras (EAN-8) — impressão em lote para múltiplos insumos.
 * Impressora: Elgin L42 Pro Full — etiqueta BOPP branco 60×30 mm (ZPL II), mesma
 * impressora configurada em "Gerar Etiquetas de Validade".
 */
import { useState, useEffect, useCallback } from 'react';
import { insumosApi, etiquetasApi, etiquetasBarcodeApi, InsumoRow, EtiquetaBarcodeLayoutConfig } from '@/services/api';
import { BRAND, Card, PageHeader, Btn, TableHead, ModalShell, Field, inputStyle } from './shared';

const DEFAULT_LAYOUT: EtiquetaBarcodeLayoutConfig = {
  offsetX: 0, offsetY: 0,
  marginLeft: 10, marginRight: 10, marginTop: 10, marginBottom: 10,
  fontSizeNome: 20, barcodeHeight: 100, moduleWidth: 3, lineGap: 8, showCode: true,
};

const LAYOUT_FIELD_GROUPS: Array<{
  title: string;
  fields: Array<{ key: keyof Omit<EtiquetaBarcodeLayoutConfig, 'showCode'>; label: string; min: number; max: number }>;
}> = [
  {
    title: 'Posição global (compensa desalinhamento da impressora)',
    fields: [
      { key: 'offsetX', label: 'Offset horizontal (X)', min: -60, max: 60 },
      { key: 'offsetY', label: 'Offset vertical (Y)', min: -60, max: 60 },
    ],
  },
  {
    title: 'Margens do conteúdo',
    fields: [
      { key: 'marginLeft', label: 'Esquerda', min: 0, max: 100 },
      { key: 'marginRight', label: 'Direita', min: 0, max: 100 },
      { key: 'marginTop', label: 'Superior', min: 0, max: 100 },
      { key: 'marginBottom', label: 'Inferior', min: 0, max: 100 },
    ],
  },
  {
    title: 'Código de barras',
    fields: [
      { key: 'fontSizeNome', label: 'Fonte do nome', min: 8, max: 60 },
      { key: 'barcodeHeight', label: 'Altura do código', min: 20, max: 180 },
      { key: 'moduleWidth', label: 'Largura do módulo', min: 1, max: 10 },
      { key: 'lineGap', label: 'Espaço nome ↔ código', min: 0, max: 40 },
    ],
  },
];

function LayoutConfigModal({ layout, testeInsumo, onClose, onSaved }: {
  layout: EtiquetaBarcodeLayoutConfig; testeInsumo: InsumoRow | null;
  onClose: () => void; onSaved: (l: EtiquetaBarcodeLayoutConfig) => void;
}) {
  const [draft, setDraft] = useState<EtiquetaBarcodeLayoutConfig>(layout);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [err, setErr] = useState('');
  const [testMsg, setTestMsg] = useState('');

  function setField(key: keyof EtiquetaBarcodeLayoutConfig, val: number | boolean) {
    setDraft(d => ({ ...d, [key]: val }));
    setTestMsg('');
  }

  async function salvar() {
    setSaving(true); setErr('');
    try {
      const saved = await etiquetasBarcodeApi.saveLayout(draft);
      onSaved(saved); onClose();
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  }

  async function restaurar() {
    setSaving(true); setErr('');
    try { setDraft(await etiquetasBarcodeApi.resetLayout()); }
    catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  }

  async function testar() {
    if (!testeInsumo?.codigoBarras) return;
    setTesting(true); setErr(''); setTestMsg('');
    try {
      const r = await etiquetasBarcodeApi.testLayout(testeInsumo.name, testeInsumo.codigoBarras, draft);
      if (r.ok) setTestMsg('✅ Etiqueta de teste enviada para a impressora.');
      else setErr(r.error || 'Falha ao imprimir teste.');
    } catch (e: any) { setErr(e.message); }
    finally { setTesting(false); }
  }

  return (
    <ModalShell title="Configurar etiqueta de código de barras" width={520} onClose={onClose}>
      <p style={{ margin: '0 0 18px', color: '#888', fontSize: 13 }}>
        Valores em dots (203 dpi — 8 dots/mm). Etiqueta BOPP 60×30 mm (480×240 dots).
      </p>

      {LAYOUT_FIELD_GROUPS.map(group => (
        <div key={group.title} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#666', marginBottom: 8 }}>{group.title}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {group.fields.map(f => (
              <div key={f.key}>
                <label style={{ display: 'block', fontSize: 11, color: '#999', marginBottom: 3 }}>
                  {f.label} <span style={{ color: '#ccc' }}>({f.min} a {f.max})</span>
                </label>
                <input
                  style={inputStyle} type="number" min={f.min} max={f.max}
                  value={draft[f.key]}
                  onChange={e => setField(f.key, Math.min(f.max, Math.max(f.min, parseInt(e.target.value) || 0)))}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 18 }}>
        <input type="checkbox" checked={draft.showCode} onChange={e => setField('showCode', e.target.checked)} />
        Exibir os dígitos abaixo do código de barras
      </label>

      {err && <p style={{ color: BRAND.red, fontSize: 13, margin: '0 0 12px' }}>{err}</p>}
      {testMsg && <p style={{ color: BRAND.green, fontSize: 13, margin: '0 0 12px', fontWeight: 700 }}>{testMsg}</p>}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn variant="ghost" onClick={onClose} disabled={saving || testing}>Cancelar</Btn>
          <Btn variant="ghost" onClick={restaurar} disabled={saving || testing}>Restaurar padrão</Btn>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn variant="secondary" onClick={testar} disabled={saving || testing || !testeInsumo}>
            {testing ? 'Imprimindo...' : '🖨️ Imprimir teste'}
          </Btn>
          <Btn onClick={salvar} disabled={saving || testing}>{saving ? 'Salvando...' : 'Salvar layout'}</Btn>
        </div>
      </div>
      {!testeInsumo && (
        <p style={{ margin: '10px 0 0', fontSize: 11, color: '#aaa' }}>
          Marque ao menos um insumo na lista para habilitar a impressão de teste.
        </p>
      )}
    </ModalShell>
  );
}

function ConfirmModal({ totalItens, totalEtiquetas, onConfirm, onCancel, loading }: {
  totalItens: number; totalEtiquetas: number; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  return (
    <ModalShell title="Confirmar impressão" width={380} onClose={onCancel}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🖨️</div>
        <p style={{ margin: '0 0 24px', color: '#555', fontSize: 15 }}>
          Serão impressas <strong>{totalEtiquetas}</strong> etiqueta{totalEtiquetas !== 1 ? 's' : ''} de{' '}
          <strong>{totalItens}</strong> insumo{totalItens !== 1 ? 's' : ''}. Isso não pode ser desfeito.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Btn variant="ghost" onClick={onCancel} disabled={loading}>Cancelar</Btn>
          <Btn onClick={onConfirm} disabled={loading}>{loading ? 'Imprimindo...' : `Imprimir ${totalEtiquetas}`}</Btn>
        </div>
      </div>
    </ModalShell>
  );
}

export default function GerarCodigoBarras() {
  const [insumos, setInsumos] = useState<InsumoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecionados, setSelecionados] = useState<Record<string, string>>({});
  const [online, setOnline] = useState<boolean | null>(null);
  const [layout, setLayout] = useState<EtiquetaBarcodeLayoutConfig>(DEFAULT_LAYOUT);
  const [showLayout, setShowLayout] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setInsumos(await insumosApi.list()); }
    catch { /* noop */ }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    etiquetasApi.status().then((r: any) => setOnline(r.online)).catch(() => setOnline(false));
  }, []);
  useEffect(() => {
    etiquetasBarcodeApi.getLayout().then(setLayout).catch(() => setLayout(DEFAULT_LAYOUT));
  }, []);

  function toggle(insumoId: string, checked: boolean) {
    setSelecionados(s => {
      const next = { ...s };
      if (checked) next[insumoId] = next[insumoId] || '1';
      else delete next[insumoId];
      return next;
    });
    setError(''); setSuccess('');
  }

  function setQuantidade(insumoId: string, valor: string) {
    setSelecionados(s => ({ ...s, [insumoId]: valor }));
  }

  const itensSelecionados = Object.entries(selecionados)
    .map(([insumoId, qtd]) => ({ insumoId, quantidade: parseInt(qtd, 10) || 0 }))
    .filter(i => i.quantidade > 0);
  const totalEtiquetas = itensSelecionados.reduce((s, i) => s + i.quantidade, 0);
  const primeiroSelecionado = insumos.find(i => selecionados[i.id] !== undefined) || null;

  async function imprimir() {
    setConfirm(false); setPrinting(true); setError(''); setSuccess('');
    try {
      const r = await etiquetasBarcodeApi.print(itensSelecionados);
      setSuccess(`✅ ${r.impressas} etiqueta${r.impressas !== 1 ? 's' : ''} enviada${r.impressas !== 1 ? 's' : ''} para impressão.`);
      setSelecionados({});
    } catch (e: any) { setError(e.message); }
    finally { setPrinting(false); }
  }

  return (
    <div>
      <PageHeader
        title="Gerar Código de Barras"
        subtitle="Selecione os insumos e a quantidade de etiquetas EAN-8 de cada um"
        action={(
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600,
              color: online === null ? '#aaa' : online ? BRAND.green : BRAND.red,
            }}>
              <span style={{ fontSize: 10 }}>●</span>
              {online === null ? 'Verificando...' : online ? 'Impressora online' : 'Impressora offline'}
            </div>
            <Btn variant="ghost" small onClick={() => setShowLayout(true)}>⚙️ Configurar etiqueta</Btn>
          </div>
        )}
      />

      {success && (
        <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 8, background: '#eafaf1', border: '1px solid #b7ebcd', fontSize: 14, fontWeight: 600, color: '#1a7a3e' }}>
          {success}
        </div>
      )}
      {error && (
        <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 8, background: '#fff0f0', border: '1px solid #fcc', fontSize: 14, fontWeight: 600, color: BRAND.red }}>
          {error}
        </div>
      )}

      {loading ? <p style={{ color: '#aaa', fontSize: 13 }}>Carregando...</p> : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <TableHead cols={['', 'Insumo', 'Código de barras', 'Quantidade']} />
            <tbody>
              {insumos.length === 0 && (
                <tr><td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: '#ccc' }}>Nenhum insumo cadastrado</td></tr>
              )}
              {insumos.map(i => {
                const marcado = selecionados[i.id] !== undefined;
                return (
                  <tr key={i.id} style={{ borderBottom: '1px solid #f5f5f5', opacity: i.active ? 1 : .5 }}>
                    <td style={{ padding: '10px 16px' }}>
                      <input type="checkbox" checked={marcado} disabled={!i.codigoBarras}
                        onChange={e => toggle(i.id, e.target.checked)} />
                    </td>
                    <td style={{ padding: '10px 16px', fontWeight: 700, color: BRAND.navy }}>{i.name}</td>
                    <td style={{ padding: '10px 16px', color: '#888', fontFamily: 'monospace' }}>
                      {i.codigoBarras || 'sem código'}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <input
                        style={{ ...inputStyle, width: 80 }} type="number" min={1} max={100}
                        value={selecionados[i.id] ?? ''} disabled={!marcado}
                        onChange={e => setQuantidade(i.id, e.target.value)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
        <Btn onClick={() => setConfirm(true)} disabled={printing || itensSelecionados.length === 0}>
          {printing ? 'Imprimindo...' : `🖨️ Imprimir Selecionados (${totalEtiquetas})`}
        </Btn>
      </div>

      {confirm && (
        <ConfirmModal
          totalItens={itensSelecionados.length} totalEtiquetas={totalEtiquetas}
          onConfirm={imprimir} onCancel={() => setConfirm(false)} loading={printing}
        />
      )}

      {showLayout && (
        <LayoutConfigModal
          layout={layout} testeInsumo={primeiroSelecionado}
          onClose={() => setShowLayout(false)} onSaved={setLayout}
        />
      )}
    </div>
  );
}
