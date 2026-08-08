/**
 * Gerar Etiquetas de Validade
 * Impressora: Elgin L42 Pro Full — etiqueta BOPP branco 60×30 mm (ZPL II)
 */
import { useState, useEffect, useRef } from 'react';
import { BRAND, Card, PageHeader, Btn } from './shared';
import { etiquetasApi } from '../../services/api';

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

// ── layout preview da etiqueta 60×30 mm (escala 4× para tela) ─────────────────
function EtiquetaPreview({ f }: { f: FormState }) {
  const W = 480, H = 240; // dots
  const scale = 0.8;

  const abbr = (v: string, max: number) =>
    v.length > max ? v.substring(0, max) + '…' : v;

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
        {/* Borda */}
        <rect x="2" y="2" width="476" height="236" fill="none" stroke="#000" strokeWidth="2" />

        {/* Produto */}
        <text x="10" y="26" fontSize="20" fontWeight="bold" fontFamily="monospace" fill="#000">
          {abbr(f.produto || 'PRODUTO', 28)}
        </text>

        {/* Separador */}
        <line x1="10" y1="33" x2="470" y2="33" stroke="#000" strokeWidth="1" />

        {/* Fab + SIF */}
        <text x="10" y="48" fontSize="13" fontFamily="monospace" fill="#333">
          {`Fab: ${abbr(f.fabricante || 'Fabricante', 18)}`}
        </text>
        <text x="295" y="48" fontSize="13" fontFamily="monospace" fill="#333">
          {`SIF: ${abbr(f.sif || '—', 8)}`}
        </text>

        {/* Lote */}
        <text x="10" y="64" fontSize="13" fontFamily="monospace" fill="#333">
          {`Lote: ${abbr(f.lote || '—', 22)}`}
        </text>

        {/* Manipulação */}
        <text x="10" y="80" fontSize="13" fontFamily="monospace" fill="#333">
          {`Manip.: ${f.dataManip || '__/__/____'}`}
        </text>

        {/* Separador */}
        <line x1="10" y1="87" x2="470" y2="87" stroke="#000" strokeWidth="1" />

        {/* Validade — destaque */}
        <text x="10" y="115" fontSize="26" fontWeight="bold" fontFamily="monospace" fill="#000">
          {`VALIDADE: ${f.dataValidade || '__/__/____'}`}
        </text>

        {/* Separador */}
        <line x1="10" y1="124" x2="470" y2="124" stroke="#000" strokeWidth="1" />

        {/* Responsável */}
        <text x="10" y="138" fontSize="12" fontFamily="monospace" fill="#555">
          {`Resp.: ${abbr(f.responsavel || '—', 30)}`}
        </text>
      </svg>
      <div style={{ fontSize:11, color:'#aaa' }}>Preview em tempo real (não é escala exata)</div>
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
  const successTimer              = useRef<ReturnType<typeof setTimeout>>();

  // Verifica status da impressora ao montar
  useEffect(() => {
    etiquetasApi.status()
      .then((r: any) => setOnline(r.online))
      .catch(() => setOnline(false));
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
          <div style={{
            display:'flex', alignItems:'center', gap:8,
            fontSize:13, fontWeight:600,
            color: online === null ? '#aaa' : online ? BRAND.green : BRAND.red,
          }}>
            <span style={{ fontSize:10 }}>●</span>
            {online === null ? 'Verificando…' : online ? 'Impressora online' : 'Impressora offline'}
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
          <EtiquetaPreview f={{
            ...form,
            dataManip:    formatDate(form.dataManip),
            dataValidade: formatDate(form.dataValidade),
          }} />

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
    </div>
  );
}
