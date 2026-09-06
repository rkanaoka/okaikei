import { useState, useEffect, useCallback } from 'react';
import { vouchersApi, menuApi } from '@/services/api';
import { BRAND, fmtBRL, fmtDate, Card, PageHeader, Btn, TableHead } from './shared';
import CurrencyInput from '@/components/CurrencyInput';

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  NEGOTIATION: { label: 'Negociação', color: '#b38600',    bg: '#FFD60A22' },
  PAID:        { label: 'Pago',       color: BRAND.green,  bg: '#2DC65318' },
  USED:        { label: 'Usado',      color: BRAND.navy,   bg: '#0D1B2A14' },
  RECURRING:   { label: 'Recorrente', color:'#5c6bc0',     bg: '#5c6bc022' },
  CANCELLED:   { label: 'Cancelado',  color: BRAND.red,    bg: '#E6394618' },
  EXPIRED:     { label: 'Vencido',    color: '#888',       bg: '#88888822' },
};

const inputStyle: React.CSSProperties = {
  width:'100%', boxSizing:'border-box', border:'1.5px solid #dde', borderRadius:8,
  padding:'10px 12px', fontSize:14, outline:'none', fontFamily:'inherit',
};
const labelStyle: React.CSSProperties = { display:'block', fontSize:12, fontWeight:700, color:'#666', marginBottom:5 };

function maskCpf(v: string) {
  return v.replace(/\D/g,'').slice(0,11)
    .replace(/(\d{3})(\d)/,'$1.$2')
    .replace(/(\d{3})(\d)/,'$1.$2')
    .replace(/(\d{3})(\d{1,2})$/,'$1-$2');
}
function maskPhone(v: string) {
  const d = v.replace(/\D/g,'').slice(0,11);
  return d.length <= 10
    ? d.replace(/(\d{2})(\d)/,'($1) $2').replace(/(\d{4})(\d{1,4})$/,'$1-$2')
    : d.replace(/(\d{2})(\d)/,'($1) $2').replace(/(\d{5})(\d{1,4})$/,'$1-$2');
}
const toDateInput = (d: string) => (d ? d.slice(0, 10) : '');

type FormState = {
  id?: string;
  customerName: string; customerCpf: string; customerBirthDate: string;
  customerAddress: string; customerPhone: string; customerEmail: string;
  discountType: 'fixed' | 'percent'; amount: string; dueDate: string; status: string;
  menuItemIds: string[]; minOrderValue: string; validDaysOfWeek: number[];
  code?: string; confirmationPassword?: string;
};

const emptyForm: FormState = {
  customerName:'', customerCpf:'', customerBirthDate:'', customerAddress:'',
  customerPhone:'', customerEmail:'', discountType:'fixed', amount:'', dueDate:'', status:'NEGOTIATION',
  menuItemIds:[], minOrderValue:'', validDaysOfWeek:[],
};

export default function Vouchers() {
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [usages, setUsages]     = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [form, setForm]         = useState<FormState | null>(null);
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState('');
  const [justCreated, setJustCreated] = useState<any>(null);
  const [revealedId, setRevealedId]   = useState<string | null>(null);
  const [menuItems, setMenuItems]     = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [v, u] = await Promise.all([vouchersApi.list(), vouchersApi.usageHistory()]);
      setVouchers(v as unknown as any[]); setUsages(u as unknown as any[]);
    }
    catch(e) {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { menuApi.list().then((d: any) => setMenuItems(d)).catch(() => {}); }, []);

  function toggleMenuItem(id: string) {
    if (!form) return;
    const has = form.menuItemIds.includes(id);
    setForm({ ...form, menuItemIds: has ? form.menuItemIds.filter(x => x !== id) : [...form.menuItemIds, id] });
  }
  function toggleWeekday(day: number) {
    if (!form) return;
    const has = form.validDaysOfWeek.includes(day);
    setForm({ ...form, validDaysOfWeek: has ? form.validDaysOfWeek.filter(x => x !== day) : [...form.validDaysOfWeek, day] });
  }

  function openCreate() { setForm({ ...emptyForm }); setErr(''); }

  function openEdit(v: any) {
    setForm({
      id: v.id,
      customerName: v.customerName ?? '',
      customerCpf: v.customerCpf ? maskCpf(v.customerCpf) : '',
      customerBirthDate: toDateInput(v.customerBirthDate ?? ''),
      customerAddress: v.customerAddress ?? '',
      customerPhone: v.customerPhone ? maskPhone(v.customerPhone) : '',
      customerEmail: v.customerEmail ?? '',
      discountType: v.discountType === 'percent' ? 'percent' : 'fixed',
      amount: String(v.amount),
      dueDate: toDateInput(v.dueDate ?? ''),
      status: v.status,
      menuItemIds: v.menuItemIds ?? [],
      minOrderValue: v.minOrderValue != null ? String(v.minOrderValue) : '',
      validDaysOfWeek: v.validDaysOfWeek ?? [],
      code: v.code,
      confirmationPassword: v.confirmationPassword,
    });
    setErr('');
  }

  async function save() {
    if (!form) return;
    const isRecurring = form.status === 'RECURRING';
    if (!isRecurring) {
      if (!form.customerName.trim())            return setErr('Informe o nome do cliente.');
      if (form.customerCpf.replace(/\D/g,'').length !== 11) return setErr('CPF inválido.');
      if (!form.customerBirthDate)               return setErr('Informe a data de nascimento.');
      if (!form.customerAddress.trim())          return setErr('Informe o endereço.');
      if (form.customerPhone.replace(/\D/g,'').length < 10) return setErr('Telefone inválido.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customerEmail)) return setErr('E-mail inválido.');
    }
    if (!form.amount || parseFloat(form.amount) <= 0) return setErr('Informe um valor válido.');
    if (form.discountType === 'percent' && parseFloat(form.amount) > 100) return setErr('Percentual não pode passar de 100.');
    // Vouchers RECURRING não exigem vencimento — ficam disponíveis sem prazo se não informado
    if (!isRecurring && !form.dueDate) return setErr('Informe a data de vencimento.');

    setSaving(true); setErr('');
    const payload = {
      customerName: isRecurring ? undefined : form.customerName.trim(),
      customerCpf: isRecurring ? undefined : form.customerCpf,
      customerBirthDate: isRecurring ? undefined : form.customerBirthDate,
      customerAddress: isRecurring ? undefined : form.customerAddress.trim(),
      customerPhone: isRecurring ? undefined : form.customerPhone,
      customerEmail: isRecurring ? undefined : form.customerEmail.trim(),
      discountType: form.discountType,
      amount: parseFloat(form.amount),
      menuItemIds: form.menuItemIds,
      minOrderValue: form.minOrderValue ? parseFloat(form.minOrderValue) : undefined,
      validDaysOfWeek: form.validDaysOfWeek,
      dueDate: form.dueDate || undefined,
      status: form.status,
    };
    try {
      if (form.id) {
        await vouchersApi.update(form.id, payload);
        await load();
        setForm(null);
      } else {
        const created: any = await vouchersApi.create({
          ...payload,
          code: form.status === 'RECURRING' ? (form.code?.trim() || undefined) : undefined,
        });
        await load();
        setForm(null);
        setJustCreated(created);
      }
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  }

  const activeVouchers = vouchers.filter((v:any) => v.status !== 'USED');

  return (
    <div>
      <PageHeader
        title="Vouchers"
        subtitle="Cupons de desconto personalizados — criação, faturamento e acompanhamento"
        action={<Btn onClick={openCreate}>+ Novo Voucher</Btn>}
      />

      {form && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:200,
          display:'flex', alignItems:'center', justifyContent:'center', overflowY:'auto', padding:'24px 0' }}>
          <div style={{ background:'#fff', borderRadius:16, padding:32, width:560, maxWidth:'90vw',
            boxShadow:'0 20px 60px rgba(0,0,0,.25)' }}>
            <h2 style={{ margin:'0 0 20px', fontSize:18, fontWeight:900, color:BRAND.navy }}>
              {form.id ? 'Editar Voucher' : 'Novo Voucher'}
            </h2>

            {form.status !== 'RECURRING' && (
              <>
                <p style={{ margin:'0 0 12px', fontSize:11, fontWeight:700, color:'#999', textTransform:'uppercase', letterSpacing:.5 }}>
                  Dados para faturamento
                </p>
                <div style={{ display:'flex', gap:10, marginBottom:14 }}>
                  <div style={{ flex:2 }}>
                    <label style={labelStyle}>Nome completo</label>
                    <input value={form.customerName} onChange={e => setForm({ ...form, customerName:e.target.value })}
                      placeholder="Nome do titular" style={inputStyle} />
                  </div>
                  <div style={{ flex:1 }}>
                    <label style={labelStyle}>CPF</label>
                    <input value={form.customerCpf} onChange={e => setForm({ ...form, customerCpf: maskCpf(e.target.value) })}
                      placeholder="000.000.000-00" style={inputStyle} />
                  </div>
                </div>
                <div style={{ display:'flex', gap:10, marginBottom:14 }}>
                  <div style={{ flex:1 }}>
                    <label style={labelStyle}>Data de nascimento</label>
                    <input type="date" value={form.customerBirthDate}
                      onChange={e => setForm({ ...form, customerBirthDate:e.target.value })} style={inputStyle} />
                  </div>
                  <div style={{ flex:1 }}>
                    <label style={labelStyle}>Telefone</label>
                    <input value={form.customerPhone} onChange={e => setForm({ ...form, customerPhone: maskPhone(e.target.value) })}
                      placeholder="(11) 91234-5678" style={inputStyle} />
                  </div>
                </div>
                <div style={{ marginBottom:14 }}>
                  <label style={labelStyle}>Endereço</label>
                  <input value={form.customerAddress} onChange={e => setForm({ ...form, customerAddress:e.target.value })}
                    placeholder="Rua, número, bairro, cidade" style={inputStyle} />
                </div>
                <div style={{ marginBottom:18 }}>
                  <label style={labelStyle}>E-mail</label>
                  <input type="email" value={form.customerEmail} onChange={e => setForm({ ...form, customerEmail:e.target.value })}
                    placeholder="cliente@email.com" style={inputStyle} />
                </div>
              </>
            )}

            <p style={{ margin:'0 0 12px', fontSize:11, fontWeight:700, color:'#999', textTransform:'uppercase', letterSpacing:.5 }}>
              Dados do voucher
            </p>
            <div style={{ display:'flex', gap:10, marginBottom:14 }}>
              <div style={{ flex:1 }}>
                <label style={labelStyle}>Tipo de desconto</label>
                <select value={form.discountType} onChange={e => setForm({ ...form, discountType: e.target.value as 'fixed'|'percent' })} style={inputStyle}>
                  <option value="fixed">Valor fixo (R$)</option>
                  <option value="percent">Porcentagem (%)</option>
                </select>
              </div>
              <div style={{ flex:1 }}>
                <label style={labelStyle}>{form.discountType === 'percent' ? 'Percentual (%)' : 'Valor (R$)'}</label>
                {form.discountType === 'percent' ? (
                  <input type="number" min="0" max={100} step="0.01" value={form.amount}
                    onChange={e => setForm({ ...form, amount:e.target.value })}
                    placeholder="10" style={inputStyle} />
                ) : (
                  <CurrencyInput value={form.amount}
                    onChange={v => setForm({ ...form, amount:v })}
                    placeholder="100.00" style={inputStyle} />
                )}
              </div>
              <div style={{ flex:1 }}>
                <label style={labelStyle}>Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status:e.target.value })} style={inputStyle}>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom:14 }}>
              <label style={labelStyle}>Itens específicos do cardápio (opcional)</label>
              <p style={{ margin:'0 0 8px', fontSize:11, color:'#999' }}>
                Se nenhum for selecionado, o desconto vale sobre o pedido inteiro.
              </p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6, maxHeight:140, overflowY:'auto', border:'1.5px solid #eee', borderRadius:8, padding:10 }}>
                {menuItems.map((it:any) => {
                  const sel = form.menuItemIds.includes(it.id);
                  return (
                    <button key={it.id} type="button" onClick={() => toggleMenuItem(it.id)} style={{
                      padding:'5px 12px', borderRadius:999, border:`1.5px solid ${sel ? BRAND.orange : '#ddd'}`,
                      background: sel ? BRAND.orange : '#fff', color: sel ? '#fff' : '#555',
                      fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'inherit',
                    }}>
                      {it.name}
                    </button>
                  );
                })}
                {menuItems.length === 0 && <span style={{ fontSize:12, color:'#ccc' }}>Carregando itens…</span>}
              </div>
            </div>

            <div style={{ display:'flex', gap:10, marginBottom:14 }}>
              <div style={{ flex:1 }}>
                <label style={labelStyle}>Pedido mínimo (R$, opcional)</label>
                <CurrencyInput value={form.minOrderValue}
                  onChange={v => setForm({ ...form, minOrderValue:v })} placeholder="Sem mínimo" style={inputStyle} />
              </div>
              <div style={{ flex:1 }}>
                <label style={labelStyle}>Vencimento{form.status === 'RECURRING' ? ' (opcional)' : ''}</label>
                <input type="date" value={form.dueDate}
                  onChange={e => setForm({ ...form, dueDate:e.target.value })} style={inputStyle} />
                {form.status === 'RECURRING' && !form.dueDate && (
                  <p style={{ margin:'4px 0 0', fontSize:11, color:'#999' }}>Sem prazo — disponível indefinidamente</p>
                )}
              </div>
            </div>

            <div style={{ marginBottom:18 }}>
              <label style={labelStyle}>Dias da semana válidos (opcional)</label>
              <p style={{ margin:'0 0 8px', fontSize:11, color:'#999' }}>
                Se nenhum for selecionado, vale todos os dias.
              </p>
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

            {form.status === 'RECURRING' && !form.id && (
              <div style={{ marginBottom:14 }}>
                <label style={labelStyle}>Código personalizado (opcional)</label>
                <input value={form.code ?? ''} onChange={e => setForm({ ...form, code:e.target.value.toUpperCase() })}
                  placeholder="Ex: FUNCIONARIO10 — deixe em branco para gerar automaticamente" style={inputStyle} />
                <p style={{ margin:'4px 0 0', fontSize:11, color:'#999' }}>
                  Vouchers recorrentes não exigem senha de confirmação e podem ser usados várias vezes até o vencimento.
                </p>
              </div>
            )}

            {form.id && (
              <div style={{ display:'flex', gap:10, marginBottom:14, background:BRAND.gray, borderRadius:8, padding:'10px 12px' }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#888' }}>Código</div>
                  <div style={{ fontSize:15, fontWeight:800, color:BRAND.navy, letterSpacing:1 }}>{form.code}</div>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#888' }}>Senha de confirmação</div>
                  <div style={{ fontSize:15, fontWeight:800, color:BRAND.navy, letterSpacing:1 }}>{form.confirmationPassword || '—'}</div>
                </div>
              </div>
            )}

            {err && <p style={{ color:BRAND.red, fontSize:13, margin:'0 0 12px' }}>{err}</p>}
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <Btn variant="ghost" onClick={() => { setForm(null); setErr(''); }}>Cancelar</Btn>
              <Btn onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Btn>
            </div>
          </div>
        </div>
      )}

      {justCreated && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:210,
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:16, padding:32, width:400, maxWidth:'90vw',
            boxShadow:'0 20px 60px rgba(0,0,0,.25)', textAlign:'center' }}>
            <div style={{ fontSize:44, marginBottom:8 }}>🎟️</div>
            <h2 style={{ margin:'0 0 4px', fontSize:18, fontWeight:900, color:BRAND.navy }}>Voucher criado!</h2>
            <p style={{ margin:'0 0 20px', fontSize:13, color:'#888' }}>{justCreated.customerName}</p>
            <div style={{ background:BRAND.gray, borderRadius:8, padding:'14px 16px', marginBottom:20 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#888', marginBottom:2 }}>Código do voucher</div>
              <div style={{ fontSize:22, fontWeight:900, color:BRAND.navy, letterSpacing:2, marginBottom: justCreated.confirmationPassword ? 12 : 0 }}>{justCreated.code}</div>
              {justCreated.confirmationPassword ? (
                <>
                  <div style={{ fontSize:11, fontWeight:700, color:'#888', marginBottom:2 }}>Senha de confirmação</div>
                  <div style={{ fontSize:22, fontWeight:900, color:BRAND.navy, letterSpacing:2 }}>{justCreated.confirmationPassword}</div>
                </>
              ) : (
                <p style={{ margin:0, fontSize:12, color:'#888' }}>
                  Voucher recorrente — sem senha, pode ser usado várias vezes com esse código{justCreated.dueDate ? ' até o vencimento.' : ', sem prazo de validade.'}
                </p>
              )}
            </div>
            <Btn onClick={() => setJustCreated(null)}>Concluir</Btn>
          </div>
        </div>
      )}

      {loading ? <p style={{ color:'#aaa', fontSize:13 }}>Carregando...</p> : (
        <>
          <Card style={{ padding:0, overflow:'hidden', marginBottom:24 }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <TableHead cols={['Cliente','CPF','Valor','Vencimento','Status','Código','']} />
              <tbody>
                {activeVouchers.length === 0 && (
                  <tr><td colSpan={7} style={{ padding:'40px', textAlign:'center', color:'#ccc' }}>
                    Nenhum voucher cadastrado
                  </td></tr>
                )}
                {activeVouchers.map((v:any) => {
                  const st = STATUS_LABELS[v.status] ?? STATUS_LABELS.NEGOTIATION;
                  const revealed = revealedId === v.id;
                  return (
                    <tr key={v.id} style={{ borderBottom:'1px solid #f5f5f5' }}>
                      <td style={{ padding:'12px 16px', fontWeight:700, color:BRAND.navy }}>{v.customerName || '—'}</td>
                      <td style={{ padding:'12px 16px', color:'#666' }}>{v.customerCpf ? maskCpf(v.customerCpf) : '—'}</td>
                      <td style={{ padding:'12px 16px', fontWeight:800, color:BRAND.green }}>
                        {v.discountType === 'percent' ? `${v.amount}%` : fmtBRL(v.amount)}
                        {(v.menuItemIds?.length > 0 || v.minOrderValue != null || v.validDaysOfWeek?.length > 0) && (
                          <div style={{ fontSize:10, fontWeight:600, color:'#999', marginTop:2 }}>com condições</div>
                        )}
                      </td>
                      <td style={{ padding:'12px 16px', color:'#666' }}>
                        {v.dueDate ? new Date(v.dueDate).toLocaleDateString('pt-BR', { timeZone:'America/Sao_Paulo' }) : 'Sem vencimento'}
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        <span style={{ fontSize:11, fontWeight:700, color:st.color, background:st.bg,
                          borderRadius:999, padding:'3px 10px', textTransform:'uppercase' }}>{st.label}</span>
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        <div style={{ fontWeight:800, color:BRAND.navy, letterSpacing:1 }}>{v.code}</div>
                        {v.confirmationPassword && (
                          <button onClick={() => setRevealedId(revealed ? null : v.id)} style={{
                            border:'none', background:'transparent', color:'#999', fontSize:11, cursor:'pointer', padding:0, fontFamily:'inherit',
                          }}>
                            {revealed ? `Senha: ${v.confirmationPassword}` : 'Ver senha'}
                          </button>
                        )}
                      </td>
                      <td style={{ padding:'12px 16px', textAlign:'right' }}>
                        <Btn small variant="ghost" onClick={() => openEdit(v)}>Editar</Btn>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          <Card style={{ padding:0, overflow:'hidden' }}>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid #f0f0f0' }}>
              <h3 style={{ margin:0, fontSize:15, fontWeight:800, color:BRAND.navy }}>Histórico de Vouchers Usados</h3>
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <TableHead cols={['Cliente','Código','Comanda','Valor aplicado','Usado em']} />
              <tbody>
                {usages.length === 0 && (
                  <tr><td colSpan={5} style={{ padding:'40px', textAlign:'center', color:'#ccc' }}>
                    Nenhum voucher usado ainda
                  </td></tr>
                )}
                {usages.map((u:any) => (
                  <tr key={u.id} style={{ borderBottom:'1px solid #f0f0f0' }}>
                    <td style={{ padding:'10px 16px', fontWeight:600, color:BRAND.navy }}>{u.voucher?.customerName ?? '—'}</td>
                    <td style={{ padding:'10px 16px', fontWeight:800, color:BRAND.navy, letterSpacing:1 }}>{u.voucher?.code ?? '—'}</td>
                    <td style={{ padding:'10px 16px', color:'#666' }}>
                      {u.comanda ? `#${u.comanda.number}${u.comanda.table ? ` · ${u.comanda.table.label}` : ''}` : '—'}
                    </td>
                    <td style={{ padding:'10px 16px', fontWeight:700, color:BRAND.green }}>{fmtBRL(u.amount)}</td>
                    <td style={{ padding:'10px 16px', color:'#999' }}>{fmtDate(u.usedAt)}</td>
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
