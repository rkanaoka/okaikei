import { useState, useEffect, useCallback } from 'react';
import { menuApi } from '@/services/api';
import { BRAND, Card, PageHeader, Btn, TableHead } from './shared';

export default function Categorias() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [form, setForm]             = useState<{ id?:string; name:string; sortOrder:string } | null>(null);
  const [saving, setSaving]         = useState(false);
  const [err, setErr]               = useState('');
  const [dragIndex, setDragIndex]   = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setCategories(await menuApi.categories.list() as unknown as any[]); }
    catch(e) {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleDragStart(idx: number) {
    setDragIndex(idx);
  }
  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    if (idx !== dragOverIndex) setDragOverIndex(idx);
  }
  async function handleDrop(idx: number) {
    setDragOverIndex(null);
    if (dragIndex === null || dragIndex === idx) { setDragIndex(null); return; }
    const reordered = [...categories];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(idx, 0, moved);
    setDragIndex(null);
    setCategories(reordered); // otimista — a ordem do cardapio-app segue o sortOrder salvo aqui
    setReordering(true);
    try {
      await Promise.all(reordered.map((c, i) => menuApi.categories.update(c.id, { sortOrder: i })));
      await load();
    } catch (e:any) {
      alert(e.message);
      await load(); // reverte pro estado do servidor em caso de falha
    } finally {
      setReordering(false);
    }
  }

  async function save() {
    if (!form?.name.trim()) { setErr('Informe o nome da categoria.'); return; }
    setSaving(true); setErr('');
    try {
      const dto = { name: form.name.trim(), sortOrder: parseInt(form.sortOrder) || 0 };
      if (form.id) await menuApi.categories.update(form.id, dto);
      else         await menuApi.categories.create(dto);
      await load(); setForm(null);
    } catch(e:any) { setErr(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <PageHeader
        title="Categorias do Cardápio"
        subtitle="Agrupamento dos itens — ex: Prato Principal, Lanches, Cervejas"
        action={
          <Btn onClick={() => setForm({ name:'', sortOrder: String(categories.length) })}>
            + Nova Categoria
          </Btn>
        }
      />

      {form && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:200,
          display:'flex', alignItems:'flex-start', justifyContent:'center', overflowY:'auto', padding:'24px 0' }}>
          <div style={{ background:'#fff', borderRadius:16, padding:32, width:420, maxWidth:'90vw',
            boxShadow:'0 20px 60px rgba(0,0,0,.25)', margin:'auto 0' }}>
            <h2 style={{ margin:'0 0 20px', fontSize:18, fontWeight:900, color:BRAND.navy }}>
              {form.id ? 'Editar Categoria' : 'Nova Categoria'}
            </h2>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#666', marginBottom:5 }}>Nome</label>
              <input value={form.name} placeholder="Ex: Para Compartilhar" onChange={e => setForm({...form, name:e.target.value})}
                style={{ width:'100%', boxSizing:'border-box', border:'1.5px solid #dde', borderRadius:8,
                  padding:'10px 12px', fontSize:14, outline:'none', fontFamily:'inherit' }} />
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#666', marginBottom:5 }}>Ordem de exibição</label>
              <input type="number" value={form.sortOrder} onChange={e => setForm({...form, sortOrder:e.target.value})}
                style={{ width:'100%', boxSizing:'border-box', border:'1.5px solid #dde', borderRadius:8,
                  padding:'10px 12px', fontSize:14, outline:'none', fontFamily:'inherit' }} />
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
          <p style={{ margin:0, padding:'12px 16px', fontSize:12, color:'#999', borderBottom:'1px solid #f5f5f5' }}>
            Arraste pelo ⠿ para reordenar — essa é a ordem que aparece no cardápio digital.
            {reordering && <span style={{ color:BRAND.orange, fontWeight:700 }}> Salvando…</span>}
          </p>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <TableHead cols={['','Nome','Ordem','Ações']} />
            <tbody>
              {categories.length === 0 && (
                <tr><td colSpan={4} style={{ padding:'40px', textAlign:'center', color:'#ccc' }}>Nenhuma categoria cadastrada</td></tr>
              )}
              {categories.map((c:any, idx:number) => (
                <tr key={c.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={() => setDragOverIndex(null)}
                  onDrop={() => handleDrop(idx)}
                  style={{
                    borderBottom:'1px solid #f5f5f5',
                    background: dragOverIndex === idx ? '#FF6B2B12' : 'transparent',
                    opacity: dragIndex === idx ? 0.4 : 1,
                  }}>
                  <td style={{ padding:'12px 8px 12px 16px', width:24, cursor:'grab', color:'#ccc', fontSize:16, userSelect:'none' }}>⠿</td>
                  <td style={{ padding:'12px 16px', fontWeight:700, color:BRAND.navy }}>{c.name}</td>
                  <td style={{ padding:'12px 16px', color:'#888' }}>{c.sortOrder}</td>
                  <td style={{ padding:'12px 16px' }}>
                    <Btn small variant="ghost" onClick={() => setForm({ id:c.id, name:c.name, sortOrder:String(c.sortOrder) })}>
                      Editar
                    </Btn>
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
