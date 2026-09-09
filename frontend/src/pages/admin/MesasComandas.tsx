import { useState, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
import { tablesApi } from '@/services/api';
import { BRAND, Card, PageHeader, Btn, TableHead } from './shared';

const CARDAPIO_URL = 'https://cardapio.bodogami.tech';

type TableType = 'MESA' | 'BALCAO' | 'MESA_EXTERNA';

const TYPE_LABEL: Record<TableType, string> = {
  MESA: 'Mesa',
  BALCAO: 'Balcão',
  MESA_EXTERNA: 'Mesa Externa',
};
const TYPE_RANGE: Record<TableType, { min: number; max: number }> = {
  MESA: { min: 0, max: 100 },
  BALCAO: { min: 0, max: 10 },
  MESA_EXTERNA: { min: 0, max: 20 },
};
const TYPE_ORDER: TableType[] = ['MESA', 'BALCAO', 'MESA_EXTERNA'];

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  FREE:     { label: 'Livre',    color: BRAND.green, bg: '#2DC65318' },
  OCCUPIED: { label: 'Ocupada',  color: BRAND.orange, bg: '#FF6B2B18' },
  RESERVED: { label: 'Reservada', color: '#5c6bc0',   bg: '#5c6bc022' },
};

type FormState = { id?: string; type: TableType; number: string; capacity: string };

export default function MesasComandas() {
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm]       = useState<FormState | null>(null);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');
  const [qrTarget, setQrTarget] = useState<any>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setTables(await tablesApi.list() as unknown as any[]); }
    catch (e) { /* noop */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() { setForm({ type: 'MESA', number: '', capacity: '4' }); setErr(''); }
  function openEdit(t: any) { setForm({ id: t.id, type: t.type, number: String(t.number), capacity: String(t.capacity) }); setErr(''); }

  async function save() {
    if (!form) return;
    const number = parseInt(form.number, 10);
    const range = TYPE_RANGE[form.type];
    if (!form.number.trim() || isNaN(number)) { setErr('Informe um número válido.'); return; }
    if (number < range.min || number > range.max) {
      setErr(`Número deve estar entre ${range.min} e ${range.max} para ${TYPE_LABEL[form.type]}.`);
      return;
    }
    setSaving(true); setErr('');
    try {
      const payload = { type: form.type, number, capacity: form.capacity ? parseInt(form.capacity, 10) : undefined };
      if (form.id) await tablesApi.update(form.id, payload);
      else         await tablesApi.create(payload);
      await load(); setForm(null);
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  }

  async function openQrCode(t: any) {
    setQrTarget(t);
    const url = `${CARDAPIO_URL}/?mesa=${encodeURIComponent(t.id)}&label=${encodeURIComponent(t.label)}`;
    const dataUrl = await QRCode.toDataURL(url, { width: 512, margin: 2 });
    setQrDataUrl(dataUrl);
  }

  function downloadQrCode() {
    if (!qrDataUrl || !qrTarget) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `qrcode-${qrTarget.label.toLowerCase().replace(/\s+/g, '-')}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  const grouped = TYPE_ORDER.map((type) => ({ type, items: tables.filter((t) => t.type === type) }));

  return (
    <div>
      <PageHeader
        title="Mesas e Comandas"
        subtitle="Cadastro de mesas, balcões e mesas externas disponíveis no app do Garçom e no Cardápio Digital"
        action={<Btn onClick={openCreate}>+ Nova Mesa</Btn>}
      />

      {form && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:200,
          display:'flex', alignItems:'flex-start', justifyContent:'center', overflowY:'auto', padding:'24px 0' }}>
          <div style={{ background:'#fff', borderRadius:16, padding:32, width:420, maxWidth:'90vw',
            boxShadow:'0 20px 60px rgba(0,0,0,.25)', margin:'auto 0' }}>
            <h2 style={{ margin:'0 0 20px', fontSize:18, fontWeight:900, color:BRAND.navy }}>
              {form.id ? 'Editar Mesa' : 'Nova Mesa'}
            </h2>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#666', marginBottom:5 }}>Tipo</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as TableType })}
                style={{ width:'100%', border:'1.5px solid #dde', borderRadius:8, padding:'10px 12px',
                  fontSize:14, outline:'none', fontFamily:'inherit', background:'#fff' }}>
                {TYPE_ORDER.map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
              </select>
            </div>
            <div style={{ display:'flex', gap:10, marginBottom:14 }}>
              <div style={{ flex:1 }}>
                <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#666', marginBottom:5 }}>
                  Número <span style={{ fontWeight:400, color:'#999' }}>({TYPE_RANGE[form.type].min}–{TYPE_RANGE[form.type].max})</span>
                </label>
                <input type="number" min={TYPE_RANGE[form.type].min} max={TYPE_RANGE[form.type].max}
                  value={form.number} onChange={e => setForm({ ...form, number: e.target.value })}
                  style={{ width:'100%', boxSizing:'border-box', border:'1.5px solid #dde', borderRadius:8,
                    padding:'10px 12px', fontSize:14, outline:'none', fontFamily:'inherit' }} />
              </div>
              <div style={{ flex:1 }}>
                <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#666', marginBottom:5 }}>Capacidade</label>
                <input type="number" min="1" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })}
                  style={{ width:'100%', boxSizing:'border-box', border:'1.5px solid #dde', borderRadius:8,
                    padding:'10px 12px', fontSize:14, outline:'none', fontFamily:'inherit' }} />
              </div>
            </div>
            <p style={{ margin:'0 0 14px', fontSize:12, color:'#999' }}>
              Será cadastrada como <b>{TYPE_LABEL[form.type]} {form.number || '…'}</b>.
            </p>
            {err && <p style={{ color:BRAND.red, fontSize:13, margin:'0 0 12px' }}>{err}</p>}
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <Btn variant="ghost" onClick={() => { setForm(null); setErr(''); }}>Cancelar</Btn>
              <Btn onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Btn>
            </div>
          </div>
        </div>
      )}

      {qrTarget && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:200,
          display:'flex', alignItems:'flex-start', justifyContent:'center', overflowY:'auto', padding:'24px 0' }}
          onClick={e => { if (e.target === e.currentTarget) { setQrTarget(null); setQrDataUrl(''); } }}>
          <div style={{ background:'#fff', borderRadius:16, padding:32, width:360, maxWidth:'90vw',
            boxShadow:'0 20px 60px rgba(0,0,0,.25)', textAlign:'center', margin:'auto 0' }}>
            <h2 style={{ margin:'0 0 4px', fontSize:18, fontWeight:900, color:BRAND.navy }}>{qrTarget.label}</h2>
            <p style={{ margin:'0 0 20px', fontSize:12, color:'#888' }}>
              Aponte a câmera pra abrir o cardápio já vinculado a esta mesa
            </p>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt={`QR Code ${qrTarget.label}`} style={{ width:'100%', borderRadius:12, border:'1px solid #eee' }} />
            ) : (
              <div style={{ padding:'60px 0', color:'#999', fontSize:13 }}>Gerando…</div>
            )}
            <div style={{ display:'flex', gap:10, justifyContent:'center', marginTop:20 }}>
              <Btn variant="ghost" onClick={() => { setQrTarget(null); setQrDataUrl(''); }}>Fechar</Btn>
              <Btn onClick={downloadQrCode} disabled={!qrDataUrl}>⬇ Baixar imagem</Btn>
            </div>
          </div>
        </div>
      )}

      {loading ? <p style={{ color:'#aaa', fontSize:13 }}>Carregando...</p> : (
        <>
          {grouped.map(({ type, items }) => (
            <Card key={type} style={{ padding:0, overflow:'hidden', marginBottom:24 }}>
              <div style={{ padding:'16px 20px', borderBottom:'1px solid #f0f0f0' }}>
                <h3 style={{ margin:0, fontSize:15, fontWeight:800, color:BRAND.navy }}>{TYPE_LABEL[type]}</h3>
              </div>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <TableHead cols={['Nome','Capacidade','Status','']} />
                <tbody>
                  {items.length === 0 && (
                    <tr><td colSpan={4} style={{ padding:'30px', textAlign:'center', color:'#ccc' }}>
                      Nenhuma cadastrada
                    </td></tr>
                  )}
                  {items.map((t: any) => {
                    const st = STATUS_CFG[t.status] ?? STATUS_CFG.FREE;
                    return (
                      <tr key={t.id} style={{ borderBottom:'1px solid #f5f5f5' }}>
                        <td style={{ padding:'12px 16px', fontWeight:700, color:BRAND.navy }}>{t.label}</td>
                        <td style={{ padding:'12px 16px', color:'#666' }}>{t.capacity} lugares</td>
                        <td style={{ padding:'12px 16px' }}>
                          <span style={{ fontSize:11, fontWeight:700, color:st.color, background:st.bg,
                            borderRadius:999, padding:'3px 10px', textTransform:'uppercase' }}>{st.label}</span>
                        </td>
                        <td style={{ padding:'12px 16px', textAlign:'right', display:'flex', gap:8, justifyContent:'flex-end' }}>
                          <Btn small variant="ghost" onClick={() => openQrCode(t)}>QR Code</Btn>
                          <Btn small variant="ghost" onClick={() => openEdit(t)}>Editar</Btn>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
