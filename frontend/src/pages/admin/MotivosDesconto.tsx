import { useState, useEffect, useCallback } from 'react';
import { reasonsApi } from '@/services/api';
import { BRAND, fmtBRL, Card, PageHeader, Btn, TableHead } from './shared';

export default function MotivosDesconto() {
  const [reasons, setReasons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm]       = useState<{ label:string; type:'percent'|'fixed'; value:string } | null>(null);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setReasons(await reasonsApi.discount.list() as unknown as any[]); }
    catch(e) {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!form) return;
    if (!form.label.trim()) { setErr('Informe um nome para o motivo.'); return; }
    if (!form.value || parseFloat(form.value) <= 0) { setErr('Informe um valor válido.'); return; }
    setSaving(true); setErr('');
    try {
      await reasonsApi.discount.create({ label: form.label.trim(), type: form.type, value: parseFloat(form.value) });
      await load(); setForm(null);
    } catch(e:any) { setErr(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <PageHeader
        title="Motivos de Desconto"
        subtitle="Descontos pré-definidos aplicáveis no fechamento da conta"
        action={<Btn onClick={() => setForm({ label:'', type:'percent', value:'' })}>+ Novo Motivo</Btn>}
      />

      {form && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:200,
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:16, padding:32, width:420, maxWidth:'90vw',
            boxShadow:'0 20px 60px rgba(0,0,0,.25)' }}>
            <h2 style={{ margin:'0 0 20px', fontSize:18, fontWeight:900, color:BRAND.navy }}>Novo Motivo de Desconto</h2>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#666', marginBottom:5 }}>Nome do motivo</label>
              <input value={form.label} onChange={e => setForm({ ...form, label:e.target.value })} placeholder="Ex: Cliente fidelidade"
                style={{ width:'100%', boxSizing:'border-box', border:'1.5px solid #dde', borderRadius:8,
                  padding:'10px 12px', fontSize:14, outline:'none', fontFamily:'inherit' }} />
            </div>
            <div style={{ display:'flex', gap:10, marginBottom:14 }}>
              <div style={{ flex:1 }}>
                <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#666', marginBottom:5 }}>Tipo</label>
                <select value={form.type} onChange={e => setForm({ ...form, type:e.target.value as 'percent'|'fixed' })}
                  style={{ width:'100%', border:'1.5px solid #dde', borderRadius:8, padding:'10px 12px',
                    fontSize:14, outline:'none', fontFamily:'inherit' }}>
                  <option value="percent">Porcentagem (%)</option>
                  <option value="fixed">Valor fixo (R$)</option>
                </select>
              </div>
              <div style={{ flex:1 }}>
                <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#666', marginBottom:5 }}>Valor</label>
                <input type="number" min="0" step="0.01" value={form.value} onChange={e => setForm({ ...form, value:e.target.value })}
                  placeholder={form.type === 'percent' ? '10' : '5.00'}
                  style={{ width:'100%', boxSizing:'border-box', border:'1.5px solid #dde', borderRadius:8,
                    padding:'10px 12px', fontSize:14, outline:'none', fontFamily:'inherit' }} />
              </div>
            </div>
            {err && <p style={{ color:BRAND.red, fontSize:13, margin:'0 0 12px' }}>{err}</p>}
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <Btn variant="ghost" onClick={() => { setForm(null); setErr(''); }}>Cancelar</Btn>
              <Btn onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Btn>
            </div>
          </div>
        </div>
      )}

      {loading ? <p style={{ color:'#aaa', fontSize:13 }}>Carregando...</p> : (
        <Card style={{ padding:0, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <TableHead cols={['Motivo','Desconto Pré-definido']} />
            <tbody>
              {reasons.length === 0 && (
                <tr><td colSpan={2} style={{ padding:'40px', textAlign:'center', color:'#ccc' }}>
                  Nenhum motivo cadastrado
                </td></tr>
              )}
              {reasons.map((r:any) => (
                <tr key={r.id} style={{ borderBottom:'1px solid #f5f5f5' }}>
                  <td style={{ padding:'12px 16px', fontWeight:700, color:BRAND.navy }}>{r.label}</td>
                  <td style={{ padding:'12px 16px' }}>
                    <span style={{ fontWeight:800, color:BRAND.green }}>
                      {r.type === 'percent' ? `${r.value}%` : fmtBRL(r.value)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
