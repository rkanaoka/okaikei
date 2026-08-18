/**
 * Gerar Etiquetas de Validade
 * Impressora: Elgin L42 Pro Full — etiqueta BOPP branco 60×30 mm (ZPL II)
 */
import React, { useState, useEffect, useRef, type ReactNode } from 'react';
import { BRAND, Card, PageHeader, Btn } from './shared';
import { etiquetasApi, EtiquetaLayoutConfig, EtiquetaValidadeInput } from '../../services/api';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

// ── tipos ──────────────────────────────────────────────────────────────────────
interface FormState {
  produto:      string;
  fabricante:   string;
  lote:         string;
  sif:          string;
  dataManip:    string;
  dataValidade: string;
  responsavel:  string;
  quantidade:   number;
}

const EMPTY: FormState = {
  produto: '', fabricante: '', lote: '', sif: '',
  dataManip: '', dataValidade: '', responsavel: '', quantidade: 1,
};

// Deve espelhar backend: gerar-etiquetas-validade/etiqueta-layout-defaults.ts
const DEFAULT_LAYOUT: EtiquetaLayoutConfig = {
  offsetX: 0, offsetY: 0,
  marginLeft: 10, marginRight: 10, marginTop: 8, marginBottom: 8,
  fontSizeProduto: 20, fontSizeInfo: 13, fontSizeValidade: 26, fontSizeResponsavel: 12,
  lineGap: 4,
};

// ── layout preview da etiqueta 60×30 mm — espelha buildZpl() do backend em dots ──
function EtiquetaPreview({ f, layout }: { f: FormState; layout: EtiquetaLayoutConfig }) {
  const W = 480, H = 240; // dots — 1:1 com o grid ZPL (203 dpi, 60×30 mm)
  const scale = 0.8;
  const L = layout;

  const abbr = (v: string, max: number) =>
    v.length > max ? v.substring(0, max) + '…' : v;
  // FO usa o canto superior-esquerdo do texto; SVG <text> usa a linha de base.
  const baseline = (topY: number, fontSize: number) => topY + Math.round(fontSize * 0.92);

  const x0 = L.marginLeft + L.offsetX;
  const contentWidth = Math.max(1, 480 - L.marginLeft - L.marginRight);
  const xSif = x0 + Math.round(contentWidth * 0.6);

  let y = L.marginTop + L.offsetY;
  const rows: React.ReactNode[] = [];

  const yProduto = y;
  rows.push(
    <text key="produto" x={x0} y={baseline(yProduto, L.fontSizeProduto)}
      fontSize={L.fontSizeProduto} fontWeight="bold" fontFamily="monospace" fill="#000">
      {abbr(f.produto || 'PRODUTO', 28)}
    </text>
  );
  y += L.fontSizeProduto + L.lineGap;

  rows.push(<line key="sep1" x1={x0} y1={y} x2={x0 + contentWidth} y2={y} stroke="#000" strokeWidth={1} />);
  y += L.lineGap;

  const yInfo1 = y;
  rows.push(
    <text key="fab" x={x0} y={baseline(yInfo1, L.fontSizeInfo)} fontSize={L.fontSizeInfo} fontFamily="monospace" fill="#333">
      {`Fab: ${abbr(f.fabricante || 'Fabricante', 18)}`}
    </text>
  );
  rows.push(
    <text key="sif" x={xSif} y={baseline(yInfo1, L.fontSizeInfo)} fontSize={L.fontSizeInfo} fontFamily="monospace" fill="#333">
      {`SIF: ${abbr(f.sif || '—', 8)}`}
    </text>
  );
  y += L.fontSizeInfo + L.lineGap;

  rows.push(
    <text key="lote" x={x0} y={baseline(y, L.fontSizeInfo)} fontSize={L.fontSizeInfo} fontFamily="monospace" fill="#333">
      {`Lote: ${abbr(f.lote || '—', 22)}`}
    </text>
  );
  y += L.fontSizeInfo + L.lineGap;

  rows.push(
    <text key="manip" x={x0} y={baseline(y, L.fontSizeInfo)} fontSize={L.fontSizeInfo} fontFamily="monospace" fill="#333">
      {`Manip.: ${f.dataManip || '__/__/____'}`}
    </text>
  );
  y += L.fontSizeInfo + L.lineGap;

  rows.push(<line key="sep2" x1={x0} y1={y} x2={x0 + contentWidth} y2={y} stroke="#000" strokeWidth={1} />);
  y += L.lineGap;

  rows.push(
    <text key="validade" x={x0} y={baseline(y, L.fontSizeValidade)}
      fontSize={L.fontSizeValidade} fontWeight="bold" fontFamily="monospace" fill="#000">
      {`VALIDADE: ${f.dataValidade || '__/__/____'}`}
    </text>
  );
  y += L.fontSizeValidade + L.lineGap;

  rows.push(<line key="sep3" x1={x0} y1={y} x2={x0 + contentWidth} y2={y} stroke="#000" strokeWidth={1} />);
  y += L.lineGap;

  rows.push(
    <text key="resp" x={x0} y={baseline(y, L.fontSizeResponsavel)} fontSize={L.fontSizeResponsavel} fontFamily="monospace" fill="#555">
      {`Resp.: ${abbr(f.responsavel || '—', 30)}`}
    </text>
  );
  y += L.fontSizeResponsavel;

  const overflow = y > (H - L.marginBottom) || x0 < 0 || (x0 + contentWidth) > W;

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
      <div style={{ fontSize:11, color:'#888', fontWeight:600, letterSpacing:.5 }}>
        PRÉVIA — 60 × 30 mm
      </div>
      <svg
        width={W * scale}
        height={H * scale}
        viewBox={`0 0 ${W} ${H}`}
        style={{ border:'1px solid #ccc', borderRadius:4, background:'#fff', display:'block' }}
      >
        <rect x={2 + L.offsetX} y={2 + L.offsetY} width="476" height="236" fill="none" stroke="#000" strokeWidth="2" />
        {rows}
        {overflow && (
          <rect x="1" y="1" width={W - 2} height={H - 2} fill="none" stroke={BRAND.red} strokeWidth="4" strokeDasharray="6,4" />
        )}
      </svg>
      {overflow ? (
        <div style={{ fontSize:12, color:BRAND.red, fontWeight:700, textAlign:'center' }}>
          ⚠️ Conteúdo ultrapassa a área da etiqueta — reduza fontes, margens ou offset
        </div>
      ) : (
        <div style={{ fontSize:11, color:'#aaa' }}>Preview em tempo real (não é escala exata)</div>
      )}
    </div>
  );
}

// ── Modal de configuração de layout (posição, margens, tamanhos de fonte) ─────
const LAYOUT_FIELD_GROUPS: Array<{
  title: string;
  fields: Array<{ key: keyof EtiquetaLayoutConfig; label: string; min: number; max: number }>;
}> = [
  {
    title: 'Posição global (compensa desalinhamento da impressora)',
    fields: [
      { key:'offsetX', label:'Offset horizontal (X)', min:-60, max:60 },
      { key:'offsetY', label:'Offset vertical (Y)',   min:-60, max:60 },
    ],
  },
  {
    title: 'Margens do conteúdo',
    fields: [
      { key:'marginLeft',   label:'Esquerda',  min:0, max:100 },
      { key:'marginRight',  label:'Direita',   min:0, max:100 },
      { key:'marginTop',    label:'Superior',  min:0, max:100 },
      { key:'marginBottom', label:'Inferior',  min:0, max:100 },
    ],
  },
  {
    title: 'Tamanho das fontes',
    fields: [
      { key:'fontSizeProduto',     label:'Produto',                  min:8, max:60 },
      { key:'fontSizeInfo',        label:'Fab / SIF / Lote / Manip.', min:8, max:40 },
      { key:'fontSizeValidade',    label:'Validade',                 min:8, max:60 },
      { key:'fontSizeResponsavel', label:'Responsável',              min:8, max:40 },
    ],
  },
  {
    title: 'Espaçamento',
    fields: [
      { key:'lineGap', label:'Entre linhas', min:0, max:40 },
    ],
  },
];

function LayoutConfigModal({
  layout, formData, isFormValid, onClose, onSaved,
}: {
  layout: EtiquetaLayoutConfig;
  formData: EtiquetaValidadeInput;
  isFormValid: boolean;
  onClose: () => void;
  onSaved: (l: EtiquetaLayoutConfig) => void;
}) {
  const [draft, setDraft]   = useState<EtiquetaLayoutConfig>(layout);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [err, setErr]       = useState<string | null>(null);
  const [testMsg, setTestMsg] = useState<string | null>(null);

  function setField(key: keyof EtiquetaLayoutConfig, val: number) {
    setDraft(d => ({ ...d, [key]: val }));
    setTestMsg(null);
  }

  async function handleSave() {
    setSaving(true); setErr(null);
    try {
      const saved = await etiquetasApi.saveLayout(draft);
      onSaved(saved);
      onClose();
    } catch (e: any) {
      setErr(e.message ?? 'Erro ao salvar layout.');
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setSaving(true); setErr(null);
    try {
      const reset = await etiquetasApi.resetLayout();
      setDraft(reset);
    } catch (e: any) {
      setErr(e.message ?? 'Erro ao restaurar layout padrão.');
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true); setErr(null); setTestMsg(null);
    try {
      const r = await etiquetasApi.testLayout(formData, draft);
      if (r.ok) setTestMsg('✅ Etiqueta de teste enviada para a impressora.');
      else setErr(r.error ?? 'Falha ao imprimir teste.');
    } catch (e: any) {
      setErr(e.message ?? 'Erro ao imprimir teste.');
    } finally {
      setTesting(false);
    }
  }

  const numInputStyle: React.CSSProperties = {
    width:'100%', boxSizing:'border-box', padding:'7px 10px', borderRadius:6,
    border:'1.5px solid #d0d5dd', fontSize:13, fontFamily:'inherit', outline:'none',
  };

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,.45)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20,
    }}>
      <div style={{
        background:'#fff', borderRadius:16, padding:'28px 32px', maxWidth:520, width:'100%',
        maxHeight:'88vh', overflowY:'auto', boxShadow:'0 8px 40px rgba(0,0,0,.18)',
      }}>
        <h2 style={{ margin:'0 0 4px', fontSize:19, fontWeight:900, color:BRAND.navy }}>
          Configurar layout da etiqueta
        </h2>
        <p style={{ margin:'0 0 20px', color:'#888', fontSize:13 }}>
          Valores em dots (203 dpi — 8 dots/mm). Etiqueta BOPP 60×30 mm (480×240 dots).
        </p>

        {LAYOUT_FIELD_GROUPS.map(group => (
          <div key={group.title} style={{ marginBottom:18 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#666', marginBottom:8 }}>{group.title}</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {group.fields.map(f => (
                <div key={f.key}>
                  <label style={{ display:'block', fontSize:11, color:'#999', marginBottom:3 }}>
                    {f.label} <span style={{ color:'#ccc' }}>({f.min} a {f.max})</span>
                  </label>
                  <input
                    style={numInputStyle}
                    type="number" min={f.min} max={f.max}
                    value={draft[f.key]}
                    onChange={e => {
                      const v = Math.min(f.max, Math.max(f.min, parseInt(e.target.value) || 0));
                      setField(f.key, v);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        {err && (
          <div style={{ marginBottom:14, padding:'10px 12px', borderRadius:8, background:'#fff0f0',
            border:'1px solid #fcc', fontSize:13, color:BRAND.red, fontWeight:600 }}>{err}</div>
        )}
        {testMsg && (
          <div style={{ marginBottom:14, padding:'10px 12px', borderRadius:8, background:'#eafaf1',
            border:'1px solid #b7ebcd', fontSize:13, color:'#1a7a3e', fontWeight:600 }}>{testMsg}</div>
        )}

        <div style={{ display:'flex', gap:10, flexWrap:'wrap', justifyContent:'space-between', marginTop:8 }}>
          <div style={{ display:'flex', gap:10 }}>
            <Btn variant="ghost" onClick={onClose} disabled={saving || testing}>Cancelar</Btn>
            <Btn variant="ghost" onClick={handleReset} disabled={saving || testing}>Restaurar padrão</Btn>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <Btn
              variant="secondary" onClick={handleTest}
              disabled={saving || testing || !isFormValid}
            >
              {testing ? 'Imprimindo…' : '🖨️ Imprimir teste'}
            </Btn>
            <Btn variant="primary" onClick={handleSave} disabled={saving || testing}>
              {saving ? 'Salvando…' : 'Salvar layout'}
            </Btn>
          </div>
        </div>
        {!isFormValid && (
          <p style={{ margin:'10px 0 0', fontSize:11, color:'#aaa' }}>
            Preencha o formulário à esquerda para habilitar a impressão de teste.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Modal de confirmação ──────────────────────────────────────────────────────
function ConfirmModal({
  quantidade, onConfirm, onCancel, loading,
}: { quantidade: number; onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,.45)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000,
    }}>
      <div style={{
        background:'#fff', borderRadius:16, padding:'32px 36px', maxWidth:380,
        boxShadow:'0 8px 40px rgba(0,0,0,.18)', textAlign:'center',
      }}>
        <div style={{ fontSize:48, marginBottom:12 }}>🖨️</div>
        <h2 style={{ margin:'0 0 8px', fontSize:20, fontWeight:900, color:BRAND.navy }}>
          Confirmar impressão
        </h2>
        <p style={{ margin:'0 0 24px', color:'#555', fontSize:15 }}>
          Serão impressas <strong>{quantidade}</strong> etiqueta{quantidade !== 1 ? 's' : ''}.
          Isso não pode ser desfeito.
        </p>
        <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
          <Btn variant="ghost" onClick={onCancel} disabled={loading}>Cancelar</Btn>
          <Btn variant="primary" onClick={onConfirm} disabled={loading}>
            {loading ? 'Imprimindo…' : `Imprimir ${quantidade}`}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function GerarEtiquetas() {
  const [form, setForm]           = useState<FormState>(EMPTY);
  const [online, setOnline]       = useState<boolean | null>(null);
  const [confirm, setConfirm]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [layout, setLayout]       = useState<EtiquetaLayoutConfig>(DEFAULT_LAYOUT);
  const [showLayout, setShowLayout] = useState(false);
  const successTimer              = useRef<ReturnType<typeof setTimeout>>();

  // Verifica status da impressora ao montar
  useEffect(() => {
    etiquetasApi.status()
      .then((r: any) => setOnline(r.online))
      .catch(() => setOnline(false));
  }, []);

  // Carrega o layout de impressão salvo (posicionamento, margens, fontes)
  useEffect(() => {
    etiquetasApi.getLayout()
      .then((l) => setLayout(l))
      .catch(() => setLayout(DEFAULT_LAYOUT));
  }, []);

  function set(key: keyof FormState, val: string | number) {
    setForm(f => ({ ...f, [key]: val }));
    setError(null);
  }

  function formatDate(raw: string): string {
    // Converte input date (YYYY-MM-DD) para DD/MM/AAAA
    if (!raw) return '';
    const [y, m, d] = raw.split('-');
    return `${d}/${m}/${y}`;
  }

  function validate(): string | null {
    if (!form.produto.trim())      return 'Produto é obrigatório.';
    if (!form.fabricante.trim())   return 'Fabricante é obrigatório.';
    if (!form.lote.trim())         return 'Lote é obrigatório.';
    if (!form.sif.trim())          return 'SIF é obrigatório.';
    if (!form.dataManip)           return 'Data de manipulação é obrigatória.';
    if (!form.dataValidade)        return 'Data de validade é obrigatória.';
    if (!form.responsavel.trim())  return 'Responsável é obrigatório.';
    if (form.quantidade < 1 || form.quantidade > 100) return 'Quantidade deve ser entre 1 e 100.';
    return null;
  }

  async function handlePrint() {
    setConfirm(false);
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        ...form,
        dataManip:    formatDate(form.dataManip),
        dataValidade: formatDate(form.dataValidade),
      };
      await etiquetasApi.print(payload);
      setSuccess(`✅ ${form.quantidade} etiqueta${form.quantidade !== 1 ? 's' : ''} enviada${form.quantidade !== 1 ? 's' : ''} para impressão.`);
      clearTimeout(successTimer.current);
      successTimer.current = setTimeout(() => setSuccess(null), 5000);
    } catch (e: any) {
      setError(e.message ?? 'Erro ao imprimir.');
    } finally {
      setLoading(false);
    }
  }

  function handleClickPrint() {
    const err = validate();
    if (err) { setError(err); return; }
    setConfirm(true);
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing:'border-box',
    padding:'9px 12px', borderRadius:8, border:'1.5px solid #d0d5dd',
    fontSize:14, fontFamily:'inherit', outline:'none',
  };
  const labelStyle: React.CSSProperties = {
    display:'block', fontSize:12, fontWeight:700,
    color:'#555', marginBottom:4, letterSpacing:.3,
  };

  return (
    <div>
      <PageHeader
        title="Gerar Etiquetas de Validade"
        subtitle="Impressora Elgin L42 Pro Full — etiqueta BOPP 60×30 mm"
        action={
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <div style={{
              display:'flex', alignItems:'center', gap:8,
              fontSize:13, fontWeight:600,
              color: online === null ? '#aaa' : online ? BRAND.green : BRAND.red,
            }}>
              <span style={{ fontSize:10 }}>●</span>
              {online === null ? 'Verificando…' : online ? 'Impressora online' : 'Impressora offline'}
            </div>
            <Btn variant="ghost" small onClick={() => setShowLayout(true)}>
              ⚙️ Configurar etiqueta
            </Btn>
          </div>
        }
      />

      {success && (
        <div style={{
          marginBottom:20, padding:'12px 16px', borderRadius:8,
          background:'#eafaf1', border:'1px solid #b7ebcd',
          fontSize:14, fontWeight:600, color:'#1a7a3e',
        }}>{success}</div>
      )}

      {error && (
        <div style={{
          marginBottom:20, padding:'12px 16px', borderRadius:8,
          background:'#fff0f0', border:'1px solid #fcc',
          fontSize:14, fontWeight:600, color:BRAND.red,
        }}>{error}</div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24, alignItems:'start' }}>

        {/* ── Formulário ── */}
        <Card>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

            <div style={{ gridColumn:'1/-1' }}>
              <label style={labelStyle}>Produto *</label>
              <input style={inputStyle} placeholder="Ex: Frango Grelhado"
                value={form.produto} onChange={e => set('produto', e.target.value)} />
            </div>

            <div>
              <label style={labelStyle}>Fabricante *</label>
              <input style={inputStyle} placeholder="Ex: Bodogami"
                value={form.fabricante} onChange={e => set('fabricante', e.target.value)} />
            </div>

            <div>
              <label style={labelStyle}>SIF *</label>
              <input style={inputStyle} placeholder="Ex: 1234"
                value={form.sif} onChange={e => set('sif', e.target.value)} />
            </div>

            <div style={{ gridColumn:'1/-1' }}>
              <label style={labelStyle}>Lote *</label>
              <input style={inputStyle} placeholder="Ex: L2024-001"
                value={form.lote} onChange={e => set('lote', e.target.value)} />
            </div>

            <div>
              <label style={labelStyle}>Data de Manipulação *</label>
              <input style={inputStyle} type="date"
                value={form.dataManip} onChange={e => set('dataManip', e.target.value)} />
            </div>

            <div>
              <label style={labelStyle}>Data de Validade *</label>
              <input style={inputStyle} type="date"
                value={form.dataValidade} onChange={e => set('dataValidade', e.target.value)} />
            </div>

            <div style={{ gridColumn:'1/-1' }}>
              <label style={labelStyle}>Responsável *</label>
              <input style={inputStyle} placeholder="Ex: João Silva"
                value={form.responsavel} onChange={e => set('responsavel', e.target.value)} />
            </div>

            {/* ── Quantidade ── */}
            <div style={{ gridColumn:'1/-1' }}>
              <label style={labelStyle}>
                Quantidade de etiquetas *
                <span style={{ fontWeight:400, color:'#aaa', marginLeft:6 }}>(máx. 100)</span>
              </label>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <input
                  style={{ ...inputStyle, width:90, textAlign:'center', fontSize:18, fontWeight:700 }}
                  type="number" min={1} max={100}
                  value={form.quantidade}
                  onChange={e => set('quantidade', Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                />
                <input
                  style={{ flex:1, accentColor: BRAND.orange }}
                  type="range" min={1} max={100}
                  value={form.quantidade}
                  onChange={e => set('quantidade', parseInt(e.target.value))}
                />
                <span style={{ fontSize:13, color:'#888', width:60 }}>
                  {form.quantidade}/100
                </span>
              </div>
            </div>

          </div>

          <div style={{ marginTop:24, display:'flex', gap:12 }}>
            <Btn variant="ghost" onClick={() => { setForm(EMPTY); setError(null); setSuccess(null); }}>
              Limpar
            </Btn>
            <Btn variant="primary" onClick={handleClickPrint} disabled={loading}>
              {loading ? 'Imprimindo…' : '🖨️  Imprimir etiquetas'}
            </Btn>
          </div>
        </Card>

        {/* ── Preview ── */}
        <Card style={{ display:'flex', flexDirection:'column', gap:16, alignItems:'center' }}>
          <EtiquetaPreview
            f={{
              ...form,
              dataManip:    formatDate(form.dataManip),
              dataValidade: formatDate(form.dataValidade),
            }}
            layout={layout}
          />

          <div style={{
            width:'100%', padding:'12px 16px', borderRadius:8,
            background:'#f8f9fa', fontSize:12, color:'#666', lineHeight:1.6,
          }}>
            <strong>Layout ZPL — Elgin L42 Pro Full</strong><br />
            Etiqueta BOPP branco · 60×30 mm · 203 DPI<br />
            Texto normalizado sem acentos (compatibilidade firmware)
          </div>
        </Card>

      </div>

      {confirm && (
        <ConfirmModal
          quantidade={form.quantidade}
          onConfirm={handlePrint}
          onCancel={() => setConfirm(false)}
          loading={loading}
        />
      )}

      {showLayout && (
        <LayoutConfigModal
          layout={layout}
          formData={{
            ...form,
            dataManip:    formatDate(form.dataManip),
            dataValidade: formatDate(form.dataValidade),
          }}
          isFormValid={validate() === null}
          onClose={() => setShowLayout(false)}
          onSaved={setLayout}
        />
      )}
    </div>
  );
}
