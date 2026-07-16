import { useState, useEffect, useCallback } from 'react';
import { optionGroupsApi } from '@/services/api';
import { BRAND, fmtBRL, Card, Btn } from './shared';
import OptionGroupEditModal from './OptionGroupEditModal';

export default function CardapioOpcoes({ menuItems }: { menuItems: any[] }) {
  const [groups, setGroups]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [form, setForm]       = useState<any>(null);
  const [linking, setLinking] = useState<{ id: string; name: string; selected: Set<string> } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setGroups(await optionGroupsApi.list() as unknown as any[]); }
    catch(e) {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function openNew() {
    setForm({ name:'', minSelect:1, maxSelect:1, active:true, options:[{ name:'', price:'' }] });
  }

  function openEdit(g: any) {
    setForm({ ...g, options: g.options.map((o:any) => ({ ...o, price:String(o.price) })) });
  }

  async function del(id: string) {
    if (!confirm('Remover este grupo de opções?')) return;
    try { await optionGroupsApi.remove(id); await load(); }
    catch(e:any) { alert(e.message); }
  }

  async function toggleGroupActive(g: any) {
    setGroups(prev => prev.map(x => x.id === g.id ? { ...x, active: !x.active } : x));
    try { await optionGroupsApi.update(g.id, { active: !g.active }); }
    catch(e:any) { alert(e.message); await load(); }
  }

  async function toggleOptionActive(g: any, opt: any) {
    setGroups(prev => prev.map(x => x.id !== g.id ? x
      : { ...x, options: x.options.map((o:any) => o.id === opt.id ? { ...o, active: !o.active } : o) }));
    try { await optionGroupsApi.updateOption(opt.id, { active: !opt.active }); }
    catch(e:any) { alert(e.message); await load(); }
  }

  function openLink(g: any) {
    setLinking({ id: g.id, name: g.name, selected: new Set(g.menuItems.map((m:any) => m.id)) });
  }

  function toggleLinkItem(itemId: string) {
    setLinking(l => {
      if (!l) return l;
      const next = new Set(l.selected);
      next.has(itemId) ? next.delete(itemId) : next.add(itemId);
      return { ...l, selected: next };
    });
  }

  async function saveLink() {
    if (!linking) return;
    try {
      await optionGroupsApi.setItems(linking.id, [...linking.selected]);
      await load(); setLinking(null);
    } catch(e:any) { alert(e.message); }
  }

  return (
    <div>
      <div style={{ marginBottom:16, display:'flex', justifyContent:'flex-end' }}>
        <Btn onClick={openNew}>+ Novo Grupo de Opções</Btn>
      </div>

      {loading
        ? <p style={{ color:'#aaa', fontSize:13 }}>Carregando...</p>
        : groups.length === 0
        ? <Card><p style={{ margin:0, color:'#aaa', fontSize:13, textAlign:'center', padding:'20px 0' }}>
            Nenhum grupo de opções cadastrado ainda.
          </p></Card>
        : <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {groups.map(g => (
              <Card key={g.id} style={{ padding:0, overflow:'hidden' }}>
                <div style={{ display:'flex', alignItems:'center', gap:16, padding:'14px 20px', cursor:'pointer' }}
                  onClick={() => toggleExpand(g.id)}>
                  <span style={{ fontWeight:800, color:BRAND.navy, flex:1, fontSize:14 }}>{g.name}</span>
                  <a onClick={e => { e.stopPropagation(); openLink(g); }}
                    style={{ fontSize:12, color:'#5c6bc0', fontWeight:700, cursor:'pointer' }}>
                    Produtos vinculados ({g.menuItems.length})
                  </a>
                  <a onClick={e => { e.stopPropagation(); openEdit(g); }}
                    style={{ fontSize:12, color:'#5c6bc0', fontWeight:700, cursor:'pointer' }}>
                    Editar
                  </a>
                  <a onClick={e => { e.stopPropagation(); del(g.id); }}
                    style={{ fontSize:12, color:BRAND.red, fontWeight:700, cursor:'pointer' }}>
                    Excluir
                  </a>
                  <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#666', cursor:'pointer' }}
                    onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={g.active} onChange={() => toggleGroupActive(g)} />
                    Grupo ativo
                  </label>
                  <span style={{ fontSize:12, color:'#aaa' }}>{expanded.has(g.id) ? '▲' : '▼'}</span>
                </div>

                {expanded.has(g.id) && (
                  <div>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                      <thead>
                        <tr style={{ background:'#f8f9fa' }}>
                          {['Nome da opção','Preço','Ativo'].map(h => (
                            <th key={h} style={{ textAlign:'left', padding:'8px 20px', fontSize:11, color:'#888',
                              fontWeight:700, textTransform:'uppercase', letterSpacing:.5 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {g.options.map((o:any) => (
                          <tr key={o.id} style={{ borderTop:'1px solid #f5f5f5' }}>
                            <td style={{ padding:'10px 20px' }}>{o.name}</td>
                            <td style={{ padding:'10px 20px', color:BRAND.green, fontWeight:700 }}>{fmtBRL(o.price)}</td>
                            <td style={{ padding:'10px 20px' }}>
                              <input type="checkbox" checked={o.active} onChange={() => toggleOptionActive(g, o)} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{ padding:'10px 20px', background:'#f8f9fa', fontSize:12, color:'#666' }}>
                      Quantas opções deste grupo o cliente poderá escolher? Mínimo: <b>{g.minSelect}</b> Máximo: <b>{g.maxSelect}</b>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
      }

      {/* Modal de criação/edição de grupo */}
      {form && (
        <OptionGroupEditModal
          initial={form}
          onClose={() => setForm(null)}
          onSaved={async () => { await load(); setForm(null); }}
        />
      )}

      {/* Modal de vínculo com produtos */}
      {linking && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:200,
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:16, padding:32, width:480, maxWidth:'90vw',
            boxShadow:'0 20px 60px rgba(0,0,0,.25)', maxHeight:'80vh', display:'flex', flexDirection:'column' }}>
            <h2 style={{ margin:'0 0 6px', fontSize:18, fontWeight:900, color:BRAND.navy }}>Produtos vinculados</h2>
            <p style={{ margin:'0 0 18px', fontSize:12, color:'#aaa' }}>{linking.name}</p>
            <div style={{ overflowY:'auto', flex:1, border:'1px solid #eee', borderRadius:8 }}>
              {menuItems.length === 0
                ? <p style={{ padding:16, fontSize:13, color:'#aaa', margin:0 }}>Nenhum item cadastrado.</p>
                : menuItems.map(item => (
                  <label key={item.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px',
                    borderBottom:'1px solid #f5f5f5', fontSize:13, cursor:'pointer' }}>
                    <input type="checkbox" checked={linking.selected.has(item.id)} onChange={() => toggleLinkItem(item.id)} />
                    {item.name}
                  </label>
                ))}
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:18 }}>
              <Btn variant="ghost" onClick={() => setLinking(null)}>Cancelar</Btn>
              <Btn onClick={saveLink}>Salvar</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
