import { useState, useEffect } from 'react';
import http from '@/services/api';
import { BRAND, Card, PageHeader, Btn } from './shared';

export default function ConfigLoja() {
  const [cfg, setCfg]     = useState<Record<string,string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved,  setSaved]    = useState(false);
  const [err,    setErr]      = useState('');

  useEffect(() => {
    http.get('/config')
      .then((data:any) => {
        const map: Record<string,string> = {};
        if (Array.isArray(data)) data.forEach((d:any) => { map[d.key] = String(d.value??''); });
        setCfg(map);
      })
      .catch(()=>{
        // API não existe ainda — preenche com defaults
        setCfg({
          restaurant_name: 'Bodogami',
          restaurant_cnpj: '',
          receipt_footer:  'Obrigado pela visita! @bodogami',
        });
      })
      .finally(()=>setLoading(false));
  }, []);

  async function save() {
    setSaving(true); setErr('');
    try {
      await Promise.all(
        Object.entries(cfg).map(([key, value]) => http.put(`/config/${key}`, { value }))
      );
      setSaved(true); setTimeout(()=>setSaved(false), 2500);
    } catch(e:any) { setErr('Erro ao salvar: ' + e.message); }
    finally { setSaving(false); }
  }

  const FIELDS = [
    { key:'restaurant_name', label:'Nome do Restaurante', placeholder:'Bodogami' },
    { key:'restaurant_cnpj', label:'CNPJ', placeholder:'00.000.000/0001-00' },
    { key:'receipt_footer',  label:'Rodapé do Recibo', placeholder:'Obrigado pela visita!' },
  ];

  if (loading) return <p style={{ color:'#aaa', fontSize:13 }}>Carregando...</p>;

  return (
    <div>
      <PageHeader title="Dados da Loja" />
      <Card style={{ maxWidth:540 }}>
        {FIELDS.map(f => (
          <div key={f.key} style={{ marginBottom:16 }}>
            <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#666', marginBottom:5 }}>{f.label}</label>
            <input value={cfg[f.key]??''} placeholder={f.placeholder}
              onChange={e => setCfg({...cfg, [f.key]:e.target.value})}
              style={{ width:'100%', boxSizing:'border-box', border:'1.5px solid #dde',
                borderRadius:8, padding:'10px 12px', fontSize:14, outline:'none', fontFamily:'inherit' }}
            />
          </div>
        ))}
        {err && <p style={{ color:BRAND.red, fontSize:13, margin:'0 0 12px' }}>{err}</p>}
        <div style={{ display:'flex', gap:12, alignItems:'center', marginTop:8 }}>
          <Btn onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar Configurações'}</Btn>
          {saved && <span style={{ color:BRAND.green, fontWeight:700, fontSize:13 }}>✓ Salvo com sucesso!</span>}
        </div>
      </Card>
    </div>
  );
}
