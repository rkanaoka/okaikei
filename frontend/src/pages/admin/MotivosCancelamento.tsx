import { useState, useEffect, useCallback } from 'react';
import { reasonsApi } from '@/services/api';
import { BRAND, fmtBRL, fmtDate, Card, PageHeader, Btn, TableHead } from './shared';

export default function MotivosCancelamento() {
  const [reasons, setReasons] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm]       = useState<{ label:string } | null>(null);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, h] = await Promise.all([reasonsApi.cancellation.list(), reasonsApi.cancellation.history()]);
      setReasons(r as unknown as any[]); setHistory(h as unknown as any[]);
    } catch(e) {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!form?.label.trim()) { setErr('Informe um nome para o motivo.'); return; }
    setSaving(true); setErr('');
    try { await reasonsApi.cancellation.create({ label: form.label.trim() }); await load(); setForm(null); }
    catch(e:any) { setErr(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <PageHeader
        title="Motivos de Cancelamento"
        subtitle="Motivos usados ao remover itens de uma comanda no caixa"
        action={<Btn onClick={() => setForm({ label:'' })}>+ Novo Motivo</Btn>}
      />

      {form && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:200,
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:16, padding:32, width:420, maxWidth:'90vw',
            boxShadow:'0 20px 60px rgba(0,0,0,.25)' }}>
            <h2 style={{ margin:'0 0 20px', fontSize:18, fontWeight:900, color:BRAND.navy }}>Novo Motivo de Cancelamento</h2>
            <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#666', marginBottom:5 }}>Nome do motivo</label>
            <input value={form.label} onChange={e => setForm({ label:e.target.value })} placeholder="Ex: Item errado"
              style={{ width:'100%', boxSizing:'border-box', border:'1.5px solid #dde', borderRadius:8,
                padding:'10px 12px', fontSize:14, outline:'none', fontFamily:'inherit' }} />
            {err && <p style={{ color:BRAND.red, fontSize:13, margin:'12px 0 0' }}>{err}</p>}
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
              <Btn variant="ghost" onClick={() => { setForm(null); setErr(''); }}>Cancelar</Btn>
              <Btn onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Btn>
            </div>
          </div>
        </div>
      )}

      {loading ? <p style={{ color:'#aaa', fontSize:13 }}>Carregando...</p> : (
        <>
          <Card style={{ padding:0, overflow:'hidden', marginBottom:24 }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <TableHead cols={['Motivo','Vezes Utilizado']} />
              <tbody>
                {reasons.length === 0 && (
                  <tr><td colSpan={2} style={{ padding:'40px', textAlign:'center', color:'#ccc' }}>
                    Nenhum motivo cadastrado
                  </td></tr>
                )}
                {reasons.map((r:any) => (
                  <tr key={r.id} style={{ borderBottom:'1px solid #f5f5f5' }}>
                    <td style={{ padding:'12px 16px', fontWeight:700, color:BRAND.navy }}>{r.label}</td>
                    <td style={{ padding:'12px 16px', fontWeight:800, color:BRAND.orange }}>{r.usageCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card style={{ padding:0, overflow:'hidden' }}>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid #f0f0f0' }}>
              <h3 style={{ margin:0, fontSize:15, fontWeight:800, color:BRAND.navy }}>Histórico de Cancelamentos</h3>
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <TableHead cols={['Data','Item','Qtd.','Valor','Motivo']} />
              <tbody>
                {history.length === 0 && (
                  <tr><td colSpan={5} style={{ padding:'40px', textAlign:'center', color:'#ccc' }}>
                    Nenhum cancelamento registrado
                  </td></tr>
                )}
                {history.map((h:any) => (
                  <tr key={h.id} style={{ borderBottom:'1px solid #f0f0f0' }}>
                    <td style={{ padding:'10px 16px', color:'#999' }}>{fmtDate(h.createdAt)}</td>
                    <td style={{ padding:'10px 16px', fontWeight:600, color:BRAND.navy }}>{h.itemName}</td>
                    <td style={{ padding:'10px 16px', textAlign:'center' }}>{h.quantity}</td>
                    <td style={{ padding:'10px 16px', fontWeight:700, color:BRAND.red }}>{fmtBRL(h.amount)}</td>
                    <td style={{ padding:'10px 16px' }}>
                      <span style={{ background:'#f0f2f5', borderRadius:4, padding:'3px 10px',
                        fontSize:11, fontWeight:700, color:'#555' }}>
                        {h.reason?.label ?? '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
