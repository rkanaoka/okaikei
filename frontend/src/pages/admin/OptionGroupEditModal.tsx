import { useState } from 'react';
import { optionGroupsApi } from '@/services/api';
import { BRAND, Btn } from './shared';

// Modal de criação/edição de um Grupo de Opções — usado tanto em CardapioOpcoes
// (tela "Itens do Cardápio > Opções") quanto na aba "Opções" da edição de um item.
export default function OptionGroupEditModal({ initial, onClose, onSaved, zIndex = 200 }: {
  initial: any; // { id?, name, minSelect, maxSelect, active, options: [{id?,name,price}] }
  onClose: () => void;
  onSaved: (group: any) => void;
  zIndex?: number;
}) {
  const [form, setForm]     = useState<any>(initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');

  function updateOptionField(idx: number, key: string, value: any) {
    setForm((f:any) => {
      const options = [...f.options];
      options[idx] = { ...options[idx], [key]: value };
      return { ...f, options };
    });
  }

  function addOption() {
    setForm((f:any) => ({ ...f, options: [...f.options, { name:'', price:'' }] }));
  }

  function removeOption(idx: number) {
    setForm((f:any) => ({ ...f, options: f.options.filter((_:any, i:number) => i !== idx) }));
  }

  async function save() {
    if (!form.name?.trim()) { setErr('Preencha o nome do grupo.'); return; }
    const options = form.options.filter((o:any) => o.name?.trim());
    if (options.length === 0) { setErr('Adicione ao menos uma opção.'); return; }
    setSaving(true); setErr('');
    try {
      const dto = {
        name: form.name,
        minSelect: parseInt(form.minSelect) || 0,
        maxSelect: parseInt(form.maxSelect) || 1,
        active: form.active !== false,
        options: options.map((o:any) => ({ id: o.id, name: o.name, price: parseFloat(o.price) || 0 })),
      };
      const saved = form.id ? await optionGroupsApi.update(form.id, dto) : await optionGroupsApi.create(dto);
      onSaved(saved);
    } catch(e:any) { setErr(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex,
      display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#fff', borderRadius:16, padding:32, width:560, maxWidth:'92vw',
        boxShadow:'0 20px 60px rgba(0,0,0,.25)', maxHeight:'90vh', overflowY:'auto' }}>
        <h2 style={{ margin:'0 0 22px', fontSize:18, fontWeight:900, color:BRAND.navy }}>
          {form.id ? 'Editar Grupo de Opções' : 'Novo Grupo de Opções'}
        </h2>

        <div style={{ marginBottom:14 }}>
          <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#666', marginBottom:5 }}>
            Nome do grupo *
          </label>
          <input type="text" value={form.name} placeholder="Ex: Escolha o sabor"
            onChange={e => setForm({...form, name:e.target.value})}
            style={{ width:'100%', boxSizing:'border-box', border:'1.5px solid #dde', borderRadius:8,
              padding:'10px 12px', fontSize:14, outline:'none', fontFamily:'inherit' }} />
        </div>

        <div style={{ display:'flex', gap:12, marginBottom:18 }}>
          <div style={{ flex:1 }}>
            <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#666', marginBottom:5 }}>
              Mínimo de opções
            </label>
            <input type="number" min={0} value={form.minSelect}
              onChange={e => setForm({...form, minSelect:e.target.value})}
              style={{ width:'100%', boxSizing:'border-box', border:'1.5px solid #dde', borderRadius:8,
                padding:'10px 12px', fontSize:14, outline:'none', fontFamily:'inherit' }} />
          </div>
          <div style={{ flex:1 }}>
            <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#666', marginBottom:5 }}>
              Máximo de opções
            </label>
            <input type="number" min={1} value={form.maxSelect}
              onChange={e => setForm({...form, maxSelect:e.target.value})}
              style={{ width:'100%', boxSizing:'border-box', border:'1.5px solid #dde', borderRadius:8,
                padding:'10px 12px', fontSize:14, outline:'none', fontFamily:'inherit' }} />
          </div>
        </div>

        <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#666', marginBottom:8 }}>Opções</label>
        <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:10 }}>
          {form.options.map((o:any, idx:number) => (
            <div key={idx} style={{ display:'flex', gap:8, alignItems:'center' }}>
              <input type="text" value={o.name} placeholder="Nome da opção"
                onChange={e => updateOptionField(idx, 'name', e.target.value)}
                style={{ flex:1, boxSizing:'border-box', border:'1.5px solid #dde', borderRadius:8,
                  padding:'8px 10px', fontSize:13, outline:'none', fontFamily:'inherit' }} />
              <input type="number" value={o.price} placeholder="0.00" step="0.01"
                onChange={e => updateOptionField(idx, 'price', e.target.value)}
                style={{ width:100, boxSizing:'border-box', border:'1.5px solid #dde', borderRadius:8,
                  padding:'8px 10px', fontSize:13, outline:'none', fontFamily:'inherit' }} />
              <button type="button" onClick={() => removeOption(idx)}
                style={{ background:'none', border:'none', color:BRAND.red, cursor:'pointer', fontSize:16, padding:'0 4px' }}>
                ✕
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addOption}
          style={{ background:'none', border:'none', color:'#5c6bc0', fontWeight:700, fontSize:13, cursor:'pointer', padding:0, marginBottom:18 }}>
          + Adicionar opção
        </button>

        {form.id && (
          <div style={{ marginBottom:14 }}>
            <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:14, cursor:'pointer', color:'#444' }}>
              <input type="checkbox" checked={form.active !== false}
                onChange={e => setForm({...form, active:e.target.checked})} />
              Grupo de opções ativo
            </label>
          </div>
        )}

        {err && <p style={{ color:BRAND.red, fontSize:13, margin:'0 0 12px' }}>{err}</p>}
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:4 }}>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Btn>
        </div>
      </div>
    </div>
  );
}
