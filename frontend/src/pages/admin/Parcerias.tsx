import { useState, useEffect, useCallback } from 'react';
import { partnershipsApi, menuApi, PartnershipCouponInput, CouponType } from '@/services/api';
import { BRAND, fmtBRL, Card, PageHeader, Btn, TableHead } from './shared';
import CurrencyInput from '@/components/CurrencyInput';

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const COUPON_TYPE_LABELS: Record<CouponType, string> = {
  TWO_FOR_ONE_ITEM:     '2 por 1 (item)',
  TWO_FOR_ONE_CATEGORY: '2 por 1 (categoria)',
  ITEM_DISCOUNT:        'Desconto (item)',
  ORDER_DISCOUNT:       'Desconto (pedido)',
};

const inputStyle: React.CSSProperties = {
  width:'100%', boxSizing:'border-box', border:'1.5px solid #dde', borderRadius:8,
  padding:'10px 12px', fontSize:14, outline:'none', fontFamily:'inherit',
};
const labelStyle: React.CSSProperties = { display:'block', fontSize:12, fontWeight:700, color:'#666', marginBottom:5 };

function maskCnpj(v: string) {
  return v.replace(/\D/g,'').slice(0,14)
    .replace(/(\d{2})(\d)/,'$1.$2')
    .replace(/(\d{3})(\d)/,'$1.$2')
    .replace(/(\d{3})(\d)/,'$1/$2')
    .replace(/(\d{4})(\d{1,2})$/,'$1-$2');
}
const toDateInput = (d: string) => (d ? d.slice(0, 10) : '');

type FormState = {
  id?: string;
  name: string; description: string; responsible: string; contact: string; cnpj: string;
  code: string; startDate: string; endDate: string;
  validDaysOfWeek: number[]; startTime: string; endTime: string;
  active: boolean;
  coupons: PartnershipCouponInput[];
};

const emptyCoupon: PartnershipCouponInput = { type: 'ORDER_DISCOUNT', discountType: 'percent' };

const emptyForm: FormState = {
  name:'', description:'', responsible:'', contact:'', cnpj:'', code:'',
  startDate:'', endDate:'', validDaysOfWeek:[], startTime:'', endTime:'', active:true,
  coupons: [{ ...emptyCoupon }],
};

export default function Parcerias() {
  const [partnerships, setPartnerships] = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [form, setForm]                 = useState<FormState | null>(null);
  const [saving, setSaving]             = useState(false);
  const [err, setErr]                   = useState('');
  const [menuItems, setMenuItems]       = useState<any[]>([]);
  const [categories, setCategories]     = useState<{id:string;name:string}[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = await partnershipsApi.list();
      setPartnerships(p as unknown as any[]);
    } catch (e) {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    menuApi.list().then((d: any) => setMenuItems(d)).catch(() => {});
    menuApi.categories.list().then((d: any) => setCategories(d)).catch(() => {});
  }, []);

  function toggleWeekday(day: number) {
    if (!form) return;
    const has = form.validDaysOfWeek.includes(day);
    setForm({ ...form, validDaysOfWeek: has ? form.validDaysOfWeek.filter(x => x !== day) : [...form.validDaysOfWeek, day] });
  }

  function updateCoupon(idx: number, patch: Partial<PartnershipCouponInput>) {
    if (!form) return;
    const coupons = [...form.coupons];
    coupons[idx] = { ...coupons[idx], ...patch };
    setForm({ ...form, coupons });
  }
  function addCoupon() {
    if (!form) return;
    setForm({ ...form, coupons: [...form.coupons, { ...emptyCoupon }] });
  }
  function removeCoupon(idx: number) {
    if (!form) return;
    setForm({ ...form, coupons: form.coupons.filter((_, i) => i !== idx) });
  }

  function openCreate() { setForm({ ...emptyForm, coupons: [{ ...emptyCoupon }] }); setErr(''); }

  function openEdit(p: any) {
    setForm({
      id: p.id,
      name: p.name, description: p.description ?? '', responsible: p.responsible ?? '',
      contact: p.contact ?? '', cnpj: p.cnpj ? maskCnpj(p.cnpj) : '',
      code: p.code, startDate: toDateInput(p.startDate ?? ''), endDate: toDateInput(p.endDate ?? ''),
      validDaysOfWeek: p.validDaysOfWeek ?? [], startTime: p.startTime ?? '', endTime: p.endTime ?? '',
      active: p.active,
      coupons: (p.coupons ?? []).map((c: any) => ({
        id: c.id, type: c.type, menuItemId: c.menuItemId, categoryId: c.categoryId,
        discountType: c.discountType, amount: c.amount != null ? Number(c.amount) : null,
        minOrderValue: c.minOrderValue != null ? Number(c.minOrderValue) : null, active: c.active,
      })),
    });
    setErr('');
  }

  function validateCouponsClientSide(coupons: PartnershipCouponInput[]): string | null {
    if (!coupons.length) return 'A parceria precisa de ao menos 1 cupom.';
    for (const c of coupons) {
      if (c.type === 'TWO_FOR_ONE_ITEM' && !c.menuItemId) return 'Selecione o item em todos os cupons "2 por 1 (item)".';
      if (c.type === 'TWO_FOR_ONE_CATEGORY' && !c.categoryId) return 'Selecione a categoria em todos os cupons "2 por 1 (categoria)".';
      if (c.type === 'ITEM_DISCOUNT') {
        if (!c.menuItemId) return 'Selecione o item em todos os cupons "Desconto (item)".';
        if (!c.amount || c.amount <= 0) return 'Informe um valor de desconto válido em todos os cupons "Desconto (item)".';
      }
      if (c.type === 'ORDER_DISCOUNT' && (!c.amount || c.amount <= 0)) {
        return 'Informe um valor de desconto válido em todos os cupons "Desconto (pedido)".';
      }
    }
    return null;
  }

  async function save() {
    if (!form) return;
    if (!form.name.trim()) return setErr('Informe o nome da parceria.');
    if (!form.code.trim()) return setErr('Informe o código da parceria.');
    if (form.startDate && form.endDate && form.startDate > form.endDate) return setErr('Data inicial não pode ser depois da final.');
    if ((form.startTime && !form.endTime) || (!form.startTime && form.endTime)) {
      return setErr('Informe início e fim do intervalo de horário, ou deixe os dois em branco.');
    }
    const couponErr = validateCouponsClientSide(form.coupons);
    if (couponErr) return setErr(couponErr);

    setSaving(true); setErr('');
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      responsible: form.responsible.trim() || undefined,
      contact: form.contact.trim() || undefined,
      cnpj: form.cnpj || undefined,
      code: form.code.trim().toUpperCase(),
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      validDaysOfWeek: form.validDaysOfWeek,
      startTime: form.startTime || undefined,
      endTime: form.endTime || undefined,
      active: form.active,
      coupons: form.coupons.map(c => ({
        id: c.id,
        type: c.type,
        menuItemId: c.type === 'TWO_FOR_ONE_ITEM' || c.type === 'ITEM_DISCOUNT' ? c.menuItemId : undefined,
        categoryId: c.type === 'TWO_FOR_ONE_CATEGORY' ? c.categoryId : undefined,
        discountType: c.type === 'ITEM_DISCOUNT' || c.type === 'ORDER_DISCOUNT' ? c.discountType : undefined,
        amount: c.type === 'ITEM_DISCOUNT' || c.type === 'ORDER_DISCOUNT' ? c.amount : undefined,
        minOrderValue: c.type === 'ORDER_DISCOUNT' ? c.minOrderValue : undefined,
      })),
    };
    try {
      if (form.id) await partnershipsApi.update(form.id, payload);
      else await partnershipsApi.create(payload);
      await load();
      setForm(null);
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  }

  function couponSummary(c: any): string {
    const itemName = c.menuItem?.name;
    const catName  = c.category?.name;
    switch (c.type) {
      case 'TWO_FOR_ONE_ITEM':     return `2x1 — ${itemName ?? '?'}`;
      case 'TWO_FOR_ONE_CATEGORY': return `2x1 — categoria ${catName ?? '?'}`;
      case 'ITEM_DISCOUNT':        return `Desconto ${c.discountType === 'percent' ? `${c.amount}%` : fmtBRL(c.amount)} — ${itemName ?? '?'}`;
      case 'ORDER_DISCOUNT':       return `Desconto ${c.discountType === 'percent' ? `${c.amount}%` : fmtBRL(c.amount)} no pedido${c.minOrderValue != null ? ` (mín. ${fmtBRL(c.minOrderValue)})` : ''}`;
      default: return c.type;
    }
  }

  return (
    <div>
      <PageHeader
        title="Parcerias"
        subtitle="Empresas parceiras e seus cupons de desconto"
        action={<Btn onClick={openCreate}>+ Nova Parceria</Btn>}
      />

      {form && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:200,
          display:'flex', alignItems:'flex-start', justifyContent:'center', overflowY:'auto', padding:'24px 0' }}>
          <div style={{ background:'#fff', borderRadius:16, padding:32, width:640, maxWidth:'92vw',
            boxShadow:'0 20px 60px rgba(0,0,0,.25)', margin:'auto 0' }}>
            <h2 style={{ margin:'0 0 20px', fontSize:18, fontWeight:900, color:BRAND.navy }}>
              {form.id ? 'Editar Parceria' : 'Nova Parceria'}
            </h2>

            <p style={{ margin:'0 0 12px', fontSize:11, fontWeight:700, color:'#999', textTransform:'uppercase', letterSpacing:.5 }}>
              Dados da parceria
            </p>
            <div style={{ display:'flex', gap:10, marginBottom:14 }}>
              <div style={{ flex:2 }}>
                <label style={labelStyle}>Nome</label>
                <input value={form.name} onChange={e => setForm({ ...form, name:e.target.value })}
                  placeholder="Ex: Empresa XYZ Ltda" style={inputStyle} />
              </div>
              <div style={{ flex:1 }}>
                <label style={labelStyle}>CNPJ</label>
                <input value={form.cnpj} onChange={e => setForm({ ...form, cnpj: maskCnpj(e.target.value) })}
                  placeholder="00.000.000/0000-00" style={inputStyle} />
              </div>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={labelStyle}>Descrição</label>
              <input value={form.description} onChange={e => setForm({ ...form, description:e.target.value })}
                placeholder="Ex: Convênio para colaboradores da empresa XYZ" style={inputStyle} />
            </div>
            <div style={{ display:'flex', gap:10, marginBottom:18 }}>
              <div style={{ flex:1 }}>
                <label style={labelStyle}>Responsável</label>
                <input value={form.responsible} onChange={e => setForm({ ...form, responsible:e.target.value })}
                  placeholder="Nome do responsável" style={inputStyle} />
              </div>
              <div style={{ flex:1 }}>
                <label style={labelStyle}>Contato</label>
                <input value={form.contact} onChange={e => setForm({ ...form, contact:e.target.value })}
                  placeholder="Telefone ou e-mail" style={inputStyle} />
              </div>
            </div>

            <p style={{ margin:'0 0 12px', fontSize:11, fontWeight:700, color:'#999', textTransform:'uppercase', letterSpacing:.5 }}>
              Validade e condição de uso
            </p>
            <div style={{ display:'flex', gap:10, marginBottom:14 }}>
              <div style={{ flex:1 }}>
                <label style={labelStyle}>Código personalizado</label>
                <input value={form.code} onChange={e => setForm({ ...form, code:e.target.value.toUpperCase() })}
                  placeholder="Ex: PARCERIAXYZ" style={inputStyle} />
              </div>
              {form.id && (
                <div style={{ flex:1 }}>
                  <label style={labelStyle}>Status</label>
                  <select value={form.active ? '1' : '0'} onChange={e => setForm({ ...form, active: e.target.value === '1' })} style={inputStyle}>
                    <option value="1">Ativa</option>
                    <option value="0">Inativa</option>
                  </select>
                </div>
              )}
            </div>
            <div style={{ display:'flex', gap:10, marginBottom:14 }}>
              <div style={{ flex:1 }}>
                <label style={labelStyle}>Data inicial (opcional)</label>
                <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate:e.target.value })} style={inputStyle} />
              </div>
              <div style={{ flex:1 }}>
                <label style={labelStyle}>Data final (opcional)</label>
                <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate:e.target.value })} style={inputStyle} />
              </div>
            </div>
            <div style={{ display:'flex', gap:10, marginBottom:14 }}>
              <div style={{ flex:1 }}>
                <label style={labelStyle}>Válido a partir de (opcional)</label>
                <input type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime:e.target.value })} style={inputStyle} />
              </div>
              <div style={{ flex:1 }}>
                <label style={labelStyle}>Válido até (opcional)</label>
                <input type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime:e.target.value })} style={inputStyle} />
              </div>
            </div>
            <div style={{ marginBottom:18 }}>
              <label style={labelStyle}>Dias da semana válidos (opcional)</label>
              <p style={{ margin:'0 0 8px', fontSize:11, color:'#999' }}>Se nenhum for selecionado, vale todos os dias.</p>
              <div style={{ display:'flex', gap:6 }}>
                {WEEKDAY_LABELS.map((label, day) => {
                  const sel = form.validDaysOfWeek.includes(day);
                  return (
                    <button key={day} type="button" onClick={() => toggleWeekday(day)} style={{
                      width:44, padding:'8px 0', borderRadius:8, border:`1.5px solid ${sel ? BRAND.orange : '#ddd'}`,
                      background: sel ? BRAND.orange : '#fff', color: sel ? '#fff' : '#555',
                      fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'inherit',
                    }}>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', margin:'0 0 12px' }}>
              <p style={{ margin:0, fontSize:11, fontWeight:700, color:'#999', textTransform:'uppercase', letterSpacing:.5 }}>Cupons</p>
              <Btn small variant="ghost" onClick={addCoupon}>+ Adicionar cupom</Btn>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:18 }}>
              {form.coupons.map((c, idx) => (
                <div key={idx} style={{ border:'1.5px solid #eee', borderRadius:10, padding:14, position:'relative' }}>
                  {form.coupons.length > 1 && (
                    <button type="button" onClick={() => removeCoupon(idx)} style={{
                      position:'absolute', top:8, right:8, background:'none', border:'none',
                      color:BRAND.red, fontSize:16, cursor:'pointer', fontFamily:'inherit',
                    }}>×</button>
                  )}
                  <div style={{ marginBottom:10 }}>
                    <label style={labelStyle}>Tipo de cupom</label>
                    <select value={c.type} onChange={e => updateCoupon(idx, { type: e.target.value as CouponType })} style={inputStyle}>
                      {Object.entries(COUPON_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>

                  {(c.type === 'TWO_FOR_ONE_ITEM' || c.type === 'ITEM_DISCOUNT') && (
                    <div style={{ marginBottom:10 }}>
                      <label style={labelStyle}>Item do cardápio</label>
                      <select value={c.menuItemId ?? ''} onChange={e => updateCoupon(idx, { menuItemId: e.target.value || null })} style={inputStyle}>
                        <option value="">Selecione um item…</option>
                        {menuItems.map((it:any) => <option key={it.id} value={it.id}>{it.name}</option>)}
                      </select>
                    </div>
                  )}

                  {c.type === 'TWO_FOR_ONE_CATEGORY' && (
                    <div style={{ marginBottom:10 }}>
                      <label style={labelStyle}>Categoria do cardápio</label>
                      <select value={c.categoryId ?? ''} onChange={e => updateCoupon(idx, { categoryId: e.target.value || null })} style={inputStyle}>
                        <option value="">Selecione uma categoria…</option>
                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                      </select>
                    </div>
                  )}

                  {(c.type === 'ITEM_DISCOUNT' || c.type === 'ORDER_DISCOUNT') && (
                    <div style={{ display:'flex', gap:10, marginBottom: c.type === 'ORDER_DISCOUNT' ? 10 : 0 }}>
                      <div style={{ flex:1 }}>
                        <label style={labelStyle}>Tipo de desconto</label>
                        <select value={c.discountType ?? 'fixed'} onChange={e => updateCoupon(idx, { discountType: e.target.value as 'fixed'|'percent' })} style={inputStyle}>
                          <option value="fixed">Valor fixo (R$)</option>
                          <option value="percent">Porcentagem (%)</option>
                        </select>
                      </div>
                      <div style={{ flex:1 }}>
                        <label style={labelStyle}>{c.discountType === 'percent' ? 'Percentual (%)' : 'Valor (R$)'}</label>
                        {c.discountType === 'percent' ? (
                          <input type="number" min="0" max={100} step="0.01" value={c.amount ?? ''}
                            onChange={e => updateCoupon(idx, { amount: e.target.value ? parseFloat(e.target.value) : null })}
                            placeholder="10" style={inputStyle} />
                        ) : (
                          <CurrencyInput value={c.amount != null ? String(c.amount) : ''}
                            onChange={v => updateCoupon(idx, { amount: v ? parseFloat(v) : null })}
                            placeholder="10.00" style={inputStyle} />
                        )}
                      </div>
                    </div>
                  )}

                  {c.type === 'ORDER_DISCOUNT' && (
                    <div>
                      <label style={labelStyle}>Pedido mínimo (R$, opcional)</label>
                      <CurrencyInput value={c.minOrderValue != null ? String(c.minOrderValue) : ''}
                        onChange={v => updateCoupon(idx, { minOrderValue: v ? parseFloat(v) : null })}
                        placeholder="Sem mínimo" style={inputStyle} />
                    </div>
                  )}
                </div>
              ))}
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
            <TableHead cols={['Nome','Responsável','Código','Cupons','Validade','Status','']} />
            <tbody>
              {partnerships.length === 0 && (
                <tr><td colSpan={7} style={{ padding:'40px', textAlign:'center', color:'#ccc' }}>
                  Nenhuma parceria cadastrada
                </td></tr>
              )}
              {partnerships.map((p:any) => (
                <tr key={p.id} style={{ borderBottom:'1px solid #f5f5f5' }}>
                  <td style={{ padding:'12px 16px', fontWeight:700, color:BRAND.navy }}>
                    {p.name}
                    {p.description && <div style={{ fontSize:11, color:'#999', marginTop:2 }}>{p.description}</div>}
                  </td>
                  <td style={{ padding:'12px 16px', color:'#666' }}>{p.responsible || '—'}</td>
                  <td style={{ padding:'12px 16px', fontWeight:800, color:BRAND.navy, letterSpacing:1 }}>{p.code}</td>
                  <td style={{ padding:'12px 16px' }}>
                    <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                      {(p.coupons ?? []).map((c:any) => (
                        <span key={c.id} style={{ fontSize:11, color: c.active ? '#666' : '#ccc' }}>
                          {couponSummary(c)}{!c.active && ' (inativo)'}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding:'12px 16px', color:'#666', fontSize:12 }}>
                    {p.startDate || p.endDate
                      ? `${p.startDate ? new Date(p.startDate).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}) : '…'} – ${p.endDate ? new Date(p.endDate).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}) : '…'}`
                      : 'Sem prazo'}
                  </td>
                  <td style={{ padding:'12px 16px' }}>
                    <span style={{
                      fontSize:11, fontWeight:700, borderRadius:999, padding:'3px 10px', textTransform:'uppercase',
                      color: p.active ? BRAND.green : '#999', background: p.active ? '#2DC65318' : '#88888818',
                    }}>
                      {p.active ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  <td style={{ padding:'12px 16px', textAlign:'right' }}>
                    <Btn small variant="ghost" onClick={() => openEdit(p)}>Editar</Btn>
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
