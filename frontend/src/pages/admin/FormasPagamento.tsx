import { useState } from 'react';
import { paymentMethodsApi, PaymentMethodRow } from '@/services/api';
import { usePaymentMethods, invalidatePaymentMethods } from '@/hooks/usePaymentMethods';
import { BRAND, Card, PageHeader, Btn, TableHead, Field, ModalShell, inputStyle } from './shared';

type Form = {
  id?: string;
  code?: string;
  label: string;
  description: string;
  color: string;
  active: boolean;
  sortOrder: string;
};

const COLOR_SUGGESTIONS = ['#2DC653', '#5c6bc0', '#00bfa5', '#FF6B2B', '#E63946', '#FFD60A', '#8e44ad', '#0D1B2A'];

// Dinheiro compõe o saldo da gaveta no fechamento do caixa — o backend impede desativar.
const CASH_CODE = 'CASH';

function emptyForm(): Form {
  return { label: '', description: '', color: '#5c6bc0', active: true, sortOrder: '' };
}

function toForm(m: PaymentMethodRow): Form {
  return {
    id: m.id, code: m.code, label: m.label, description: m.description ?? '',
    color: m.color, active: m.active, sortOrder: String(m.sortOrder),
  };
}

export default function FormasPagamento() {
  const { methods, loading, error, reload } = usePaymentMethods();
  const [form, setForm]     = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');

  async function refresh() {
    invalidatePaymentMethods();
    await reload();
  }

  function close() {
    setForm(null);
    setErr('');
  }

  async function save() {
    if (!form) return;
    if (!form.label.trim()) { setErr('Informe o nome da forma de pagamento.'); return; }
    if (form.sortOrder.trim() && !/^\d+$/.test(form.sortOrder.trim())) { setErr('A ordem deve ser um número inteiro.'); return; }
    setSaving(true); setErr('');
    try {
      const payload = {
        label:       form.label.trim(),
        description: form.description.trim() || null,
        color:       form.color,
        active:      form.active,
        ...(form.sortOrder.trim() ? { sortOrder: Number(form.sortOrder) } : {}),
      };
      if (form.id) await paymentMethodsApi.update(form.id, payload);
      else         await paymentMethodsApi.create(payload);
      await refresh();
      close();
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  }

  async function toggleActive(m: PaymentMethodRow) {
    setErr('');
    try {
      await paymentMethodsApi.update(m.id, { active: !m.active });
      await refresh();
    } catch (e: any) { setErr(e.message); }
  }

  return (
    <div>
      <PageHeader
        title="Formas de Pagamento"
        subtitle="Métodos aceitos no fechamento das comandas"
        action={<Btn onClick={() => { setErr(''); setForm(emptyForm()); }}>+ Nova Forma de Pagamento</Btn>}
      />

      {form && (
        <ModalShell title={form.id ? 'Editar Forma de Pagamento' : 'Nova Forma de Pagamento'} width={440} onClose={close}>
          <Field label="Nome">
            <input value={form.label} maxLength={60} autoFocus
              onChange={e => setForm({ ...form, label: e.target.value })}
              placeholder="Ex: Vale Alimentação" style={inputStyle} />
          </Field>
          <Field label="Descrição (opcional)">
            <input value={form.description} maxLength={200}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Ex: Ticket, Alelo, VR" style={inputStyle} />
          </Field>
          <Field label="Cor">
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              <input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })}
                style={{ width:40, height:32, padding:0, border:'1.5px solid #dde', borderRadius:6, cursor:'pointer', background:'#fff' }} />
              {COLOR_SUGGESTIONS.map(c => (
                <button key={c} type="button" title={c} onClick={() => setForm({ ...form, color: c })}
                  style={{ width:22, height:22, borderRadius:'50%', background:c, cursor:'pointer',
                    border: form.color.toLowerCase() === c.toLowerCase() ? `3px solid ${BRAND.navy}` : '2px solid #fff',
                    boxShadow:'0 0 0 1px #dde' }} />
              ))}
            </div>
          </Field>
          <Field label="Ordem de exibição (opcional)">
            <input value={form.sortOrder} inputMode="numeric"
              onChange={e => setForm({ ...form, sortOrder: e.target.value })}
              placeholder={form.id ? '' : 'Automática (no fim da lista)'} style={{ ...inputStyle, width:180 }} />
          </Field>
          {form.id && (
            <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'#666', marginBottom:14,
              cursor: form.code === CASH_CODE ? 'not-allowed' : 'pointer' }}>
              <input type="checkbox" checked={form.active} disabled={form.code === CASH_CODE}
                onChange={e => setForm({ ...form, active: e.target.checked })} />
              Ativo
              {form.code === CASH_CODE && <span style={{ fontSize:11, color:'#aaa' }}>(usado no fechamento do caixa)</span>}
            </label>
          )}
          {err && <p style={{ color:BRAND.red, fontSize:13, margin:'0 0 12px' }}>{err}</p>}
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
            <Btn variant="ghost" onClick={close}>Cancelar</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Btn>
          </div>
        </ModalShell>
      )}

      {!form && err && <p style={{ color:BRAND.red, fontSize:13, margin:'0 0 12px' }}>{err}</p>}
      {error && !loading && <p style={{ color:BRAND.red, fontSize:13, margin:'0 0 12px' }}>{error}</p>}

      {loading && methods.length === 0 ? <p style={{ color:'#aaa', fontSize:13 }}>Carregando...</p> : (
        <Card style={{ padding:0, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <TableHead cols={['Forma de pagamento','Código','Usos','Ativo','']} />
            <tbody>
              {methods.length === 0 && (
                <tr><td colSpan={5} style={{ padding:'40px', textAlign:'center', color:'#ccc' }}>
                  Nenhuma forma de pagamento cadastrada
                </td></tr>
              )}
              {methods.map(m => (
                <tr key={m.id} style={{ borderBottom:'1px solid #f5f5f5', opacity: m.active ? 1 : .5 }}>
                  <td style={{ padding:'12px 16px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ width:10, height:10, borderRadius:'50%', background:m.color, flexShrink:0 }} />
                      <div>
                        <div style={{ fontWeight:700, fontSize:14, color:BRAND.navy }}>{m.label}</div>
                        {m.description && <div style={{ fontSize:12, color:'#aaa' }}>{m.description}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding:'12px 16px', color:'#888', fontFamily:'monospace' }}>{m.code}</td>
                  <td style={{ padding:'12px 16px', color:'#888' }}>{m.usageCount ?? 0}</td>
                  <td style={{ padding:'12px 16px' }}>
                    <input type="checkbox" checked={m.active} disabled={m.code === CASH_CODE}
                      title={m.code === CASH_CODE ? 'Dinheiro é usado no fechamento do caixa e não pode ser desativado' : undefined}
                      onChange={() => toggleActive(m)} />
                  </td>
                  <td style={{ padding:'12px 16px', textAlign:'right' }}>
                    <Btn small variant="ghost" onClick={() => { setErr(''); setForm(toForm(m)); }}>Editar</Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <p style={{ color:'#aaa', fontSize:12, margin:'12px 0 0' }}>
        Formas desativadas deixam de aparecer no caixa, mas continuam no histórico e nos relatórios.
      </p>
    </div>
  );
}
