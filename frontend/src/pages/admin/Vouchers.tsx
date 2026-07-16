import { useState, useEffect, useCallback } from 'react';
import { vouchersApi } from '@/services/api';
import { BRAND, fmtBRL, Card, PageHeader, Btn, TableHead } from './shared';

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  NEGOTIATION: { label: 'Negociação', color: '#b38600',    bg: '#FFD60A22' },
  PAID:        { label: 'Pago',       color: BRAND.green,  bg: '#2DC65318' },
  USED:        { label: 'Usado',      color: BRAND.navy,   bg: '#0D1B2A14' },
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
  amount: string; dueDate: string; status: string;
  code?: string; confirmationPassword?: string;
};

const emptyForm: FormState = {
  customerName:'', customerCpf:'', customerBirthDate:'', customerAddress:'',
  customerPhone:'', customerEmail:'', amount:'', dueDate:'', status:'NEGOTIATION',
};

export default function Vouchers() {
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [form, setForm]         = useState<FormState | null>(null);
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState('');
  const [justCreated, setJustCreated] = useState<any>(null);
  const [revealedId, setRevealedId]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setVouchers(await vouchersApi.list() as unknown as any[]); }
    catch(e) {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() { setForm({ ...emptyForm }); setErr(''); }

  function openEdit(v: any) {
    setForm({
      id: v.id,
      customerName: v.customerName,
      customerCpf: maskCpf(v.customerCpf),
      customerBirthDate: toDateInput(v.customerBirthDate),
      customerAddress: v.customerAddress,
      customerPhone: maskPhone(v.customerPhone),
      customerEmail: v.customerEmail,
      amount: String(v.amount),
      dueDate: toDateInput(v.dueDate),
      status: v.status,
      code: v.code,
      confirmationPassword: v.confirmationPassword,
    });
    setErr('');
  }

  async function save() {
    if (!form) return;
    if (!form.customerName.trim())            return setErr('Informe o nome do cliente.');
    if (form.customerCpf.replace(/\D/g,'').length !== 11) return setErr('CPF inválido.');
    if (!form.customerBirthDate)               return setErr('Informe a data de nascimento.');
    if (!form.customerAddress.trim())          return setErr('Informe o endereço.');
    if (form.customerPhone.replace(/\D/g,'').length < 10) return setErr('Telefone inválido.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customerEmail)) return setErr('E-mail inválido.');
    if (!form.amount || parseFloat(form.amount) <= 0) return setErr('Informe um valor válido.');
    if (!form.dueDate)                         return setErr('Informe a data de vencimento.');

    setSaving(true); setErr('');
    const payload = {
      customerName: form.customerName.trim(),
      customerCpf: form.customerCpf,
      customerBirthDate: form.customerBirthDate,
      customerAddress: form.customerAddress.trim(),
      customerPhone: form.customerPhone,
      customerEmail: form.customerEmail.trim(),
      amount: parseFloat(form.amount),
      dueDate: form.dueDate,
      status: form.status,
    };
    try {
      if (form.id) {
        await vouchersApi.update(form.id, payload);
        await load();
        setForm(null);
      } else {
        const created: any = await vouchersApi.create(payload);
        await load();
        setForm(null);
        setJustCreated(created);
      }
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  }

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

            <p style={{ margin:'0 0 12px', fontSize:11, fontWeight:700, color:'#999', textTransform:'uppercase', letterSpacing:.5 }}>
              Dados do voucher
            </p>
            <div style={{ display:'flex', gap:10, marginBottom:14 }}>
              <div style={{ flex:1 }}>
                <label style={labelStyle}>Valor (R$)</label>
                <input type="number" min="0" step="0.01" value={form.amount}
                  onChange={e => setForm({ ...form, amount:e.target.value })} placeholder="100.00" style={inputStyle} />
              </div>
              <div style={{ flex:1 }}>
                <label style={labelStyle}>Vencimento</label>
                <input type="date" value={form.dueDate}
                  onChange={e => setForm({ ...form, dueDate:e.target.value })} style={inputStyle} />
              </div>
              <div style={{ flex:1 }}>
                <label style={labelStyle}>Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status:e.target.value })} style={inputStyle}>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>

            {form.id && (
              <div style={{ display:'flex', gap:10, marginBottom:14, background:BRAND.gray, borderRadius:8, padding:'10px 12px' }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#888' }}>Código</div>
                  <div style={{ fontSize:15, fontWeight:800, color:BRAND.navy, letterSpacing:1 }}>{form.code}</div>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#888' }}>Senha de confirmação</div>
                  <div style={{ fontSize:15, fontWeight:800, color:BRAND.navy, letterSpacing:1 }}>{form.confirmationPassword}</div>
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
              <div style={{ fontSize:22, fontWeight:900, color:BRAND.navy, letterSpacing:2, marginBottom:12 }}>{justCreated.code}</div>
              <div style={{ fontSize:11, fontWeight:700, color:'#888', marginBottom:2 }}>Senha de confirmação</div>
              <div style={{ fontSize:22, fontWeight:900, color:BRAND.navy, letterSpacing:2 }}>{justCreated.confirmationPassword}</div>
            </div>
            <Btn onClick={() => setJustCreated(null)}>Concluir</Btn>
          </div>
        </div>
      )}

      {loading ? <p style={{ color:'#aaa', fontSize:13 }}>Carregando...</p> : (
        <Card style={{ padding:0, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <TableHead cols={['Cliente','CPF','Valor','Vencimento','Status','Código','']} />
            <tbody>
              {vouchers.length === 0 && (
                <tr><td colSpan={7} style={{ padding:'40px', textAlign:'center', color:'#ccc' }}>
                  Nenhum voucher cadastrado
                </td></tr>
              )}
              {vouchers.map((v:any) => {
                const st = STATUS_LABELS[v.status] ?? STATUS_LABELS.NEGOTIATION;
                const revealed = revealedId === v.id;
                return (
                  <tr key={v.id} style={{ borderBottom:'1px solid #f5f5f5' }}>
                    <td style={{ padding:'12px 16px', fontWeight:700, color:BRAND.navy }}>{v.customerName}</td>
                    <td style={{ padding:'12px 16px', color:'#666' }}>{maskCpf(v.customerCpf)}</td>
                    <td style={{ padding:'12px 16px', fontWeight:800, color:BRAND.green }}>{fmtBRL(v.amount)}</td>
                    <td style={{ padding:'12px 16px', color:'#666' }}>{new Date(v.dueDate).toLocaleDateString('pt-BR', { timeZone:'America/Sao_Paulo' })}</td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ fontSize:11, fontWeight:700, color:st.color, background:st.bg,
                        borderRadius:999, padding:'3px 10px', textTransform:'uppercase' }}>{st.label}</span>
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ fontWeight:800, color:BRAND.navy, letterSpacing:1 }}>{v.code}</div>
                      <button onClick={() => setRevealedId(revealed ? null : v.id)} style={{
                        border:'none', background:'transparent', color:'#999', fontSize:11, cursor:'pointer', padding:0, fontFamily:'inherit',
                      }}>
                        {revealed ? `Senha: ${v.confirmationPassword}` : 'Ver senha'}
                      </button>
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
      )}
    </div>
  );
}
