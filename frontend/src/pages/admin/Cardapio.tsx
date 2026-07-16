import { useState, useEffect, useCallback } from 'react';
import { menuApi, optionGroupsApi } from '@/services/api';
import { BRAND, fmtBRL, PRINT_CAT_LABELS, Card, PageHeader, Btn, TableHead } from './shared';
import CardapioOpcoes from './CardapioOpcoes';
import OptionGroupEditModal from './OptionGroupEditModal';

const DAYS = [
  { v: 0, l: 'Dom' }, { v: 1, l: 'Seg' }, { v: 2, l: 'Ter' }, { v: 3, l: 'Qua' },
  { v: 4, l: 'Qui' }, { v: 5, l: 'Sex' }, { v: 6, l: 'Sáb' },
];
const DEFAULT_SCHEDULE = { enabled: false, days: [] as number[], startTime: '', endTime: '' };

export default function Cardapio() {
  const [items, setItems]           = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [groups, setGroups]         = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [form, setForm]             = useState<any>(null);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [tab, setTab]               = useState<'geral'|'opcoes'|'disponibilidade'>('geral');
  const [section, setSection]       = useState<'itens'|'opcoes'>('itens');
  const [catFilter, setCat]         = useState('all');
  const [saving, setSaving]         = useState(false);
  const [err, setErr]               = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [i, c, g] = await Promise.all([menuApi.listAll(), menuApi.categories.list(), optionGroupsApi.list()]);
      setItems(i as unknown as any[]); setCategories(c as unknown as any[]); setGroups(g as unknown as any[]);
    } catch(e) {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = catFilter === 'all' ? items
    : catFilter === 'none' ? items.filter(i => !i.categoryId)
    : items.filter(i => i.categoryId === catFilter);

  function openNew() {
    setForm({ name:'', categoryId:'', printCategories:[], price:'', description:'', available:true,
      imageUrl:'', chargeServiceFee:true, availabilitySchedule:null, optionGroupIds:[] });
    setTab('geral');
  }

  function openEdit(item: any) {
    const linkedIds = new Set(groups.filter(g => g.menuItems.some((m:any) => m.id === item.id)).map(g => g.id));
    const order: string[] = (Array.isArray(item.optionGroupOrder) ? item.optionGroupOrder : []).filter((id:string) => linkedIds.has(id));
    const missing = [...linkedIds].filter(id => !order.includes(id));
    setForm({ ...item, price:String(item.price), categoryId: item.categoryId ?? '', printCategories: item.printCategories ?? [],
      imageUrl: item.imageUrl ?? '', chargeServiceFee: item.chargeServiceFee !== false,
      availabilitySchedule: item.availabilitySchedule ?? null, optionGroupIds: [...order, ...missing] });
    setTab('geral');
  }

  function addGroupToItem(groupId: string) {
    setForm((f:any) => f.optionGroupIds.includes(groupId) ? f : { ...f, optionGroupIds: [...f.optionGroupIds, groupId] });
  }

  function removeGroupFromItem(groupId: string) {
    setForm((f:any) => ({ ...f, optionGroupIds: f.optionGroupIds.filter((id:string) => id !== groupId) }));
  }

  function moveGroup(idx: number, dir: -1|1) {
    setForm((f:any) => {
      const ids = [...f.optionGroupIds];
      const j = idx + dir;
      if (j < 0 || j >= ids.length) return f;
      [ids[idx], ids[j]] = [ids[j], ids[idx]];
      return { ...f, optionGroupIds: ids };
    });
  }

  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f:any) => ({ ...f, imageUrl: reader.result as string }));
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function toggleDay(day: number) {
    setForm((f:any) => {
      const current: number[] = f.availabilitySchedule?.days ?? [];
      const next = current.includes(day) ? current.filter((d:number) => d !== day) : [...current, day];
      return { ...f, availabilitySchedule: { ...(f.availabilitySchedule ?? DEFAULT_SCHEDULE), days: next } };
    });
  }

  async function save() {
    if (!form.name?.trim() || !form.price) { setErr('Preencha nome e preço.'); return; }
    setSaving(true); setErr('');
    try {
      const printCategories: string[] = form.printCategories ?? [];
      const dto = {
        name: form.name, price: parseFloat(form.price), description: form.description,
        categoryId: form.categoryId || null,
        printCategories,
        // categoria legada obrigatória no banco — deriva da 1a impressora marcada
        category: printCategories[0] ?? 'kitchen',
        imageUrl: form.imageUrl || null,
        chargeServiceFee: form.chargeServiceFee !== false,
        availabilitySchedule: form.availabilitySchedule?.enabled ? form.availabilitySchedule : null,
        optionGroupIds: form.optionGroupIds ?? [],
      };
      if (form.id) await menuApi.update(form.id, { ...dto, available: form.available });
      else         await menuApi.create({ ...dto, available: true });
      await load(); setForm(null);
    } catch(e:any) { setErr(e.message); }
    finally { setSaving(false); }
  }

  async function del(id: string) {
    if (!confirm('Remover este item do cardápio?')) return;
    try { await menuApi.remove(id); await load(); }
    catch(e:any) { alert(e.message); }
  }

  async function toggleAvailable(item: any) {
    // Otimista: atualiza local antes de confirmar com o servidor
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, available: !i.available } : i));
    try { await menuApi.update(item.id, { available: !item.available }); }
    catch(e:any) { alert(e.message); await load(); }
  }

  function togglePrintCategory(cat: string) {
    setForm((f:any) => {
      const current: string[] = f.printCategories ?? [];
      const next = current.includes(cat) ? current.filter(c => c !== cat) : [...current, cat];
      return { ...f, printCategories: next };
    });
  }

  return (
    <div>
      <PageHeader
        title="Cardápio"
        subtitle={section === 'itens' ? `${items.length} itens cadastrados` : 'Grupos de opções para personalizar itens'}
        action={section === 'itens' ? <Btn onClick={openNew}>+ Novo Item</Btn> : undefined}
      />

      {/* Section switcher */}
      <div style={{ display:'flex', gap:4, marginBottom:20, borderBottom:'1.5px solid #e5e5e5' }}>
        {(['itens','opcoes'] as const).map(s => (
          <button key={s} onClick={() => setSection(s)} style={{
            padding:'10px 18px', border:'none', background:'none', cursor:'pointer',
            fontSize:14, fontWeight:700, color: section===s ? BRAND.navy : '#aaa',
            borderBottom: section===s ? `2.5px solid ${BRAND.orange}` : '2.5px solid transparent',
            marginBottom:-1.5,
          }}>
            {s==='itens' ? 'Itens' : 'Opções'}
          </button>
        ))}
      </div>

      {section === 'opcoes' && <CardapioOpcoes menuItems={items} />}

      {section === 'itens' && <>
      {/* Category pills */}
      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        {[{ id:'all', name:'Todos' }, ...categories, { id:'none', name:'Sem categoria' }].map((cat:any) => (
          <button key={cat.id} onClick={() => setCat(cat.id)} style={{
            padding:'6px 16px', borderRadius:20, border:'none', fontWeight:700,
            fontSize:13, cursor:'pointer',
            background: catFilter===cat.id ? BRAND.navy : '#ebebeb',
            color:       catFilter===cat.id ? '#fff' : '#555',
          }}>
            {cat.name}
          </button>
        ))}
      </div>

      {/* Modal */}
      {form && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:200,
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:16, padding:32, width:520, maxWidth:'90vw',
            boxShadow:'0 20px 60px rgba(0,0,0,.25)', maxHeight:'90vh', overflowY:'auto' }}>
            <h2 style={{ margin:'0 0 22px', fontSize:18, fontWeight:900, color:BRAND.navy }}>
              {form.id ? 'Editar Item' : 'Novo Item do Cardápio'}
            </h2>

            <div style={{ display:'flex', gap:4, marginBottom:20, borderBottom:'1.5px solid #eee' }}>
              {(['geral','opcoes','disponibilidade'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  padding:'8px 16px', border:'none', background:'none', cursor:'pointer',
                  fontSize:13, fontWeight:700, color: tab===t ? BRAND.navy : '#aaa',
                  borderBottom: tab===t ? `2.5px solid ${BRAND.orange}` : '2.5px solid transparent',
                  marginBottom:-1.5,
                }}>
                  {t==='geral' ? 'Geral' : t==='opcoes' ? 'Opções' : 'Disponibilidade'}
                </button>
              ))}
            </div>

            {tab === 'geral' && (
              <div>
                {[
                  { label:'Nome *',       key:'name',        type:'text',   placeholder:'Ex: Ramen Shoyu' },
                  { label:'Preço (R$) *', key:'price',       type:'number', placeholder:'0.00' },
                  { label:'Descrição',    key:'description', type:'text',   placeholder:'Ingredientes, detalhes...' },
                ].map(f => (
                  <div key={f.key} style={{ marginBottom:14 }}>
                    <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#666', marginBottom:5 }}>{f.label}</label>
                    <input type={f.type} value={form[f.key]??''} placeholder={f.placeholder}
                      onChange={e => setForm({...form, [f.key]:e.target.value})}
                      style={{ width:'100%', boxSizing:'border-box', border:'1.5px solid #dde', borderRadius:8,
                        padding:'10px 12px', fontSize:14, outline:'none', fontFamily:'inherit' }}
                    />
                  </div>
                ))}

                <div style={{ marginBottom:14 }}>
                  <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#666', marginBottom:5 }}>Foto do produto</label>
                  <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                    <div style={{ width:64, height:64, borderRadius:8, overflow:'hidden', background:'#f4f6f8',
                      border:'1.5px solid #dde', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {form.imageUrl
                        ? <img src={form.imageUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                        : <span style={{ fontSize:22, color:'#ccc' }}>🍱</span>}
                    </div>
                    <div>
                      <input type="file" accept="image/*" onChange={onPhotoChange} style={{ fontSize:12 }} />
                      <p style={{ margin:'6px 0 0', fontSize:11, color:'#aaa' }}>Dimensão sugerida: 700x700px</p>
                      {form.imageUrl && (
                        <button type="button" onClick={() => setForm({...form, imageUrl:''})}
                          style={{ marginTop:4, fontSize:11, color:BRAND.red, background:'none', border:'none', cursor:'pointer', padding:0 }}>
                          Remover foto
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom:14 }}>
                  <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#666', marginBottom:5 }}>Categoria</label>
                  <select value={form.categoryId ?? ''} onChange={e => setForm({...form, categoryId:e.target.value})}
                    style={{ width:'100%', border:'1.5px solid #dde', borderRadius:8, padding:'10px 12px',
                      fontSize:14, outline:'none', fontFamily:'inherit' }}>
                    <option value="">— Sem categoria —</option>
                    {categories.map((c:any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div style={{ marginBottom:14 }}>
                  <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#666', marginBottom:8 }}>
                    Impressão <span style={{ fontWeight:400, textTransform:'none' }}>(onde este item deve ser impresso)</span>
                  </label>
                  <div style={{ display:'flex', gap:16 }}>
                    {(['kitchen','bar','cashier'] as const).map(cat => (
                      <label key={cat} style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'#444', cursor:'pointer' }}>
                        <input type="checkbox" checked={(form.printCategories ?? []).includes(cat)} onChange={() => togglePrintCategory(cat)} />
                        {PRINT_CAT_LABELS[cat]}
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom:14 }}>
                  <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:14, cursor:'pointer', color:'#444' }}>
                    <input type="checkbox" checked={form.chargeServiceFee !== false}
                      onChange={e => setForm({...form, chargeServiceFee:e.target.checked})} />
                    Cobrar taxa de serviço
                  </label>
                  <p style={{ margin:'4px 0 0 26px', fontSize:11, color:'#aaa' }}>
                    Se desmarcado, o valor deste item não entra na base de cálculo da gorjeta/taxa de serviço.
                  </p>
                </div>

                {form.id && (
                  <div style={{ marginBottom:14 }}>
                    <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:14, cursor:'pointer', color:'#444' }}>
                      <input type="checkbox" checked={form.available}
                        onChange={e => setForm({...form, available:e.target.checked})} />
                      Disponível no cardápio
                    </label>
                  </div>
                )}
              </div>
            )}

            {tab === 'opcoes' && (
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#666', marginBottom:8 }}>
                  Adicionar opção previamente cadastrada
                </label>
                <select value="" onChange={e => { if (e.target.value) addGroupToItem(e.target.value); }}
                  style={{ width:'100%', border:'1.5px solid #dde', borderRadius:8, padding:'10px 12px',
                    fontSize:14, outline:'none', fontFamily:'inherit', marginBottom:16 }}>
                  <option value="">— Selecionar grupo de opções —</option>
                  {groups.filter((g:any) => !form.optionGroupIds.includes(g.id)).map((g:any) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>

                {form.optionGroupIds.length === 0 ? (
                  <p style={{ margin:0, fontSize:13, color:'#aaa', textAlign:'center', padding:'20px 0' }}>
                    Nenhuma opção adicionada a este item.
                  </p>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {form.optionGroupIds.map((gid: string, idx: number) => {
                      const g = groups.find((x:any) => x.id === gid);
                      if (!g) return null;
                      const isFirst = idx === 0, isLast = idx === form.optionGroupIds.length - 1;
                      return (
                        <div key={gid} style={{ display:'flex', alignItems:'center', gap:10, border:'1.5px solid #eee',
                          borderRadius:8, padding:'10px 12px' }}>
                          <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                            <button type="button" onClick={() => moveGroup(idx, -1)} disabled={isFirst}
                              style={{ background:'none', border:'none', cursor: isFirst ? 'default' : 'pointer',
                                color: isFirst ? '#ddd' : '#888', fontSize:11, padding:0, lineHeight:1 }}>▲</button>
                            <button type="button" onClick={() => moveGroup(idx, 1)} disabled={isLast}
                              style={{ background:'none', border:'none', cursor: isLast ? 'default' : 'pointer',
                                color: isLast ? '#ddd' : '#888', fontSize:11, padding:0, lineHeight:1 }}>▼</button>
                          </div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontWeight:700, color:BRAND.navy, fontSize:13 }}>{g.name}</div>
                            <div style={{ fontSize:11, color:'#aaa' }}>
                              Mín {g.minSelect} · Máx {g.maxSelect} · {g.options.length} opções
                            </div>
                          </div>
                          <button type="button" onClick={() => setEditingGroup(g)}
                            style={{ background:'none', border:'none', color:'#5c6bc0', fontWeight:700, fontSize:12, cursor:'pointer', padding:0 }}>
                            Editar
                          </button>
                          <button type="button" onClick={() => removeGroupFromItem(gid)}
                            style={{ background:'none', border:'none', color:BRAND.red, cursor:'pointer', fontSize:16, padding:'0 2px' }}>
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <p style={{ margin:'14px 0 0', fontSize:11, color:'#aaa' }}>
                  Novos grupos de opções são cadastrados na aba "Itens do Cardápio &gt; Opções".
                </p>
              </div>
            )}

            {tab === 'disponibilidade' && (
              <div>
                <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:14, cursor:'pointer', color:'#444', marginBottom:16 }}>
                  <input type="checkbox" checked={!!form.availabilitySchedule?.enabled}
                    onChange={e => setForm({...form, availabilitySchedule: { ...(form.availabilitySchedule ?? DEFAULT_SCHEDULE), enabled:e.target.checked }})} />
                  Restringir disponibilidade a dias/horários específicos
                </label>
                {form.availabilitySchedule?.enabled && (
                  <>
                    <div style={{ marginBottom:16 }}>
                      <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#666', marginBottom:8 }}>Dias da semana</label>
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                        {DAYS.map(d => (
                          <button key={d.v} type="button" onClick={() => toggleDay(d.v)} style={{
                            width:40, height:36, borderRadius:8, border:'1.5px solid #dde', cursor:'pointer', fontSize:12, fontWeight:700,
                            background: (form.availabilitySchedule?.days ?? []).includes(d.v) ? BRAND.navy : '#fff',
                            color: (form.availabilitySchedule?.days ?? []).includes(d.v) ? '#fff' : '#666',
                          }}>{d.l}</button>
                        ))}
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:12 }}>
                      <div style={{ flex:1 }}>
                        <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#666', marginBottom:5 }}>Horário inicial</label>
                        <input type="time" value={form.availabilitySchedule?.startTime ?? ''}
                          onChange={e => setForm({...form, availabilitySchedule: { ...form.availabilitySchedule, startTime:e.target.value }})}
                          style={{ width:'100%', boxSizing:'border-box', border:'1.5px solid #dde', borderRadius:8,
                            padding:'10px 12px', fontSize:14, outline:'none', fontFamily:'inherit' }} />
                      </div>
                      <div style={{ flex:1 }}>
                        <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#666', marginBottom:5 }}>Horário final</label>
                        <input type="time" value={form.availabilitySchedule?.endTime ?? ''}
                          onChange={e => setForm({...form, availabilitySchedule: { ...form.availabilitySchedule, endTime:e.target.value }})}
                          style={{ width:'100%', boxSizing:'border-box', border:'1.5px solid #dde', borderRadius:8,
                            padding:'10px 12px', fontSize:14, outline:'none', fontFamily:'inherit' }} />
                      </div>
                    </div>
                    <p style={{ margin:'10px 0 0', fontSize:11, color:'#aaa' }}>
                      Se nenhum dia for selecionado, o item fica disponível em todos os dias dentro do horário definido.
                    </p>
                  </>
                )}
              </div>
            )}

            {err && <p style={{ color:BRAND.red, fontSize:13, margin:'14px 0 0' }}>{err}</p>}
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:18 }}>
              <Btn variant="ghost" onClick={() => { setForm(null); setErr(''); }}>Cancelar</Btn>
              <Btn onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Btn>
            </div>
          </div>
        </div>
      )}

      {editingGroup && (
        <OptionGroupEditModal
          initial={{ ...editingGroup, options: editingGroup.options.map((o:any) => ({ ...o, price:String(o.price) })) }}
          zIndex={300}
          onClose={() => setEditingGroup(null)}
          onSaved={async () => { await load(); setEditingGroup(null); }}
        />
      )}

      {loading
        ? <p style={{ color:'#aaa', fontSize:13 }}>Carregando...</p>
        : <Card style={{ padding:0, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <TableHead cols={['Nome','Categoria','Impressão','Preço','Disponível','Ações']} />
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={6} style={{ padding:'40px', textAlign:'center', color:'#ccc' }}>
                    Nenhum item encontrado
                  </td></tr>
                )}
                {filtered.map(item => (
                  <tr key={item.id} style={{ borderBottom:'1px solid #f5f5f5' }}>
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:36, height:36, borderRadius:6, overflow:'hidden', background:'#f4f6f8',
                          border:'1px solid #eee', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          {item.imageUrl
                            ? <img src={item.imageUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                            : <span style={{ fontSize:14, color:'#ddd' }}>🍱</span>}
                        </div>
                        <div>
                          <div style={{ fontWeight:700, color:BRAND.navy }}>{item.name}</div>
                          {item.description && <div style={{ fontSize:11, color:'#aaa', marginTop:2 }}>{item.description}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ background:'#f0f2f5', borderRadius:4, padding:'3px 10px',
                        fontSize:11, fontWeight:700, color:'#555' }}>
                        {item.menuCategory?.name ?? 'Sem categoria'}
                      </span>
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                        {(item.printCategories?.length ? item.printCategories : [item.category]).map((c:string) => (
                          <span key={c} style={{ background:'#eef2ff', borderRadius:4, padding:'2px 8px', fontSize:10, fontWeight:700, color:'#5c6bc0' }}>
                            {PRINT_CAT_LABELS[c] ?? c}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding:'12px 16px', fontWeight:800, color:BRAND.green }}>{fmtBRL(item.price)}</td>
                    <td style={{ padding:'12px 16px' }}>
                      <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
                        <input type="checkbox" checked={item.available} onChange={() => toggleAvailable(item)} />
                        <span style={{ fontSize:11, fontWeight:700,
                          color:item.available ? BRAND.green : '#aaa' }}>
                          {item.available ? 'Disponível' : 'Indisponível'}
                        </span>
                      </label>
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ display:'flex', gap:6 }}>
                        <Btn small variant="ghost" onClick={() => openEdit(item)}>Editar</Btn>
                        <Btn small variant="danger" onClick={() => del(item.id)}>Excluir</Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
      }
      </>}
    </div>
  );
}
