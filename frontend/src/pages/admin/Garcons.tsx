import { useState, useEffect, useCallback } from 'react';
import { garconsApi, usersApi, GarcomRow, AuthUser } from '@/services/api';
import { BRAND, Card, PageHeader, Btn, TableHead } from './shared';

type Form = { id?: string; name: string; userId: string; active: boolean };

export default function Garcons() {
  const [garcons, setGarcons] = useState<GarcomRow[]>([]);
  const [users, setUsers]     = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm]       = useState<Form | null>(null);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [g, u] = await Promise.all([garconsApi.list(), usersApi.list()]);
      setGarcons(g);
      setUsers(u);
    } catch (e) { /* noop */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!form) return;
    if (!form.name.trim()) { setErr('Informe o nome do garçom.'); return; }
    setSaving(true); setErr('');
    try {
      const payload = { name: form.name.trim(), userId: form.userId || null };
      if (form.id) await garconsApi.update(form.id, { ...payload, active: form.active });
      else         await garconsApi.create(payload);
      await load(); setForm(null);
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  }

  async function toggleActive(g: GarcomRow) {
    try {
      await garconsApi.update(g.id, { active: !g.active });
      await load();
    } catch (e: any) { setErr(e.message); }
  }

  return (
    <div>
      <PageHeader
        title="Cadastro de Garçom"
        subtitle="Código de 3 dígitos usado para identificar o garçom no fechamento da comanda"
        action={<Btn onClick={() => setForm({ name:'', userId:'', active:true })}>+ Novo Garçom</Btn>}
      />

      {form && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:200,
          display:'flex', alignItems:'flex-start', justifyContent:'center', overflowY:'auto', padding:'24px 0' }}>
          <div style={{ background:'#fff', borderRadius:16, padding:32, width:420, maxWidth:'90vw',
            boxShadow:'0 20px 60px rgba(0,0,0,.25)', margin:'auto 0' }}>
            <h2 style={{ margin:'0 0 20px', fontSize:18, fontWeight:900, color:BRAND.navy }}>
              {form.id ? 'Editar Garçom' : 'Novo Garçom'}
            </h2>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#666', marginBottom:5 }}>Nome do garçom</label>
              <input value={form.name} onChange={e => setForm({ ...form, name:e.target.value })} placeholder="Ex: João Silva"
                style={{ width:'100%', boxSizing:'border-box', border:'1.5px solid #dde', borderRadius:8,
                  padding:'10px 12px', fontSize:14, outline:'none', fontFamily:'inherit' }} />
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#666', marginBottom:5 }}>Usuário vinculado (opcional)</label>
              <select value={form.userId} onChange={e => setForm({ ...form, userId:e.target.value })}
                style={{ width:'100%', border:'1.5px solid #dde', borderRadius:8, padding:'10px 12px',
                  fontSize:14, outline:'none', fontFamily:'inherit' }}>
                <option value="">Nenhum</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
              </select>
            </div>
            {form.id && (
              <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'#666', marginBottom:14, cursor:'pointer' }}>
                <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active:e.target.checked })} />
                Ativo
              </label>
            )}
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
            <TableHead cols={['Código','Nome','Usuário vinculado','Ativo','']} />
            <tbody>
              {garcons.length === 0 && (
                <tr><td colSpan={5} style={{ padding:'40px', textAlign:'center', color:'#ccc' }}>
                  Nenhum garçom cadastrado
                </td></tr>
              )}
              {garcons.map(g => (
                <tr key={g.id} style={{ borderBottom:'1px solid #f5f5f5', opacity: g.active ? 1 : .5 }}>
                  <td style={{ padding:'12px 16px', fontWeight:900, color:BRAND.navy, letterSpacing:2 }}>{g.code}</td>
                  <td style={{ padding:'12px 16px', fontWeight:700, color:BRAND.navy }}>{g.name}</td>
                  <td style={{ padding:'12px 16px', color:'#888' }}>{g.user ? `${g.user.name} (${g.user.email})` : '—'}</td>
                  <td style={{ padding:'12px 16px' }}>
                    <input type="checkbox" checked={g.active} onChange={() => toggleActive(g)} />
                  </td>
                  <td style={{ padding:'12px 16px' }}>
                    <Btn small variant="ghost" onClick={() => setForm({ id:g.id, name:g.name, userId:g.userId ?? '', active:g.active })}>
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
