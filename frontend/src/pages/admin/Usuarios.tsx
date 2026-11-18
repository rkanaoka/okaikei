import { useState, useEffect } from 'react';
import { usersApi, UserRow } from '@/services/api';
import { BRAND, Card, PageHeader, Btn, TableHead, Field, ModalShell, inputStyle } from './shared';
import { PERMISSION_GROUPS } from './permissions';

const MASTER_ADMIN_EMAIL = 'admin@bodogami.com.br';

type Edit = { active: boolean; permissions: string[] };
type Form = { id?: string; name: string; email: string; active: boolean; permissions: string[] };

/** Situação do usuário, exibida como etiqueta ao lado do nome. */
function statusOf(u: UserRow): { label: string; color: string; bg: string; hint: string } | null {
  if (u.email === MASTER_ADMIN_EMAIL) return null;
  if (!u.firebaseUid) {
    return { label: 'Aguardando 1º acesso', color: '#8a6d00', bg: '#FFF8E1', hint: 'Cadastrado aqui — ainda não entrou com a conta Google deste e-mail.' };
  }
  if (!u.active && u.adminPermissions.length === 0) {
    return { label: 'Solicitou acesso', color: '#B42318', bg: '#FEF3F2', hint: 'Entrou com Google e está aguardando liberação: marque as permissões e salve.' };
  }
  if (!u.active) return { label: 'Inativo', color: '#667085', bg: '#F2F4F7', hint: 'Sem acesso ao painel.' };
  return null;
}

export default function Usuarios() {
  const [users, setUsers]       = useState<UserRow[]>([]);
  const [edits, setEdits]       = useState<Record<string, Edit>>({});
  const [loading, setLoading]   = useState(true);
  const [savingId, setSavingId] = useState('');
  const [err, setErr]           = useState('');
  const [okMsg, setOkMsg]       = useState('');
  const [form, setForm]         = useState<Form | null>(null);
  const [formErr, setFormErr]   = useState('');
  const [formSaving, setFormSaving] = useState(false);

  function load() {
    setLoading(true);
    usersApi.list()
      .then((data) => {
        setUsers(data);
        const next: Record<string, Edit> = {};
        data.forEach((u) => { next[u.id] = { active: u.active, permissions: u.adminPermissions }; });
        setEdits(next);
      })
      .catch((e: any) => setErr('Erro ao carregar usuários: ' + e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function isDirty(u: UserRow) {
    const e = edits[u.id];
    if (!e) return false;
    return e.active !== u.active
      || e.permissions.length !== u.adminPermissions.length
      || e.permissions.some((p) => !u.adminPermissions.includes(p));
  }

  function toggleActive(id: string) {
    setEdits((e) => ({ ...e, [id]: { ...e[id], active: !e[id].active } }));
  }

  function togglePermission(id: string, key: string) {
    setEdits((e) => {
      const current = e[id].permissions;
      const permissions = current.includes(key) ? current.filter((p) => p !== key) : [...current, key];
      // Liberar a primeira permissão de quem "solicitou acesso" já ativa a conta
      const active = e[id].active || (current.length === 0 && permissions.length > 0);
      return { ...e, [id]: { active, permissions } };
    });
  }

  async function save(id: string) {
    setSavingId(id); setErr(''); setOkMsg('');
    try {
      await usersApi.update(id, { active: edits[id].active, adminPermissions: edits[id].permissions });
      setOkMsg('Permissões salvas.');
      load();
    } catch (e: any) { setErr('Erro ao salvar: ' + e.message); }
    finally { setSavingId(''); }
  }

  function openCreate() {
    setFormErr(''); setOkMsg('');
    setForm({ name: '', email: '', active: true, permissions: [] });
  }

  function openEdit(u: UserRow) {
    setFormErr(''); setOkMsg('');
    const e = edits[u.id];
    setForm({ id: u.id, name: u.name, email: u.email, active: e.active, permissions: e.permissions });
  }

  function toggleFormPermission(key: string) {
    setForm((f) => f && ({
      ...f,
      permissions: f.permissions.includes(key) ? f.permissions.filter((p) => p !== key) : [...f.permissions, key],
    }));
  }

  async function submitForm() {
    if (!form) return;
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    if (!name) { setFormErr('Informe o nome.'); return; }
    if (!form.id && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setFormErr('Informe um e-mail válido.'); return; }
    if (form.permissions.length === 0) { setFormErr('Selecione ao menos uma área de acesso.'); return; }
    setFormSaving(true); setFormErr('');
    try {
      if (form.id) {
        await usersApi.update(form.id, { name, active: form.active, adminPermissions: form.permissions });
        setOkMsg(`Usuário ${name} atualizado.`);
      } else {
        await usersApi.create({ name, email, active: form.active, adminPermissions: form.permissions });
        setOkMsg(`${name} cadastrado(a). Já pode entrar no painel com a conta Google ${email}.`);
      }
      setForm(null);
      load();
    } catch (e: any) { setFormErr(e.message); }
    finally { setFormSaving(false); }
  }

  if (loading && users.length === 0) return <p style={{ color: '#aaa', fontSize: 13 }}>Carregando...</p>;

  const pendingRequests = users.filter((u) => u.firebaseUid && !u.active && u.adminPermissions.length === 0 && u.email !== MASTER_ADMIN_EMAIL).length;
  const allSelected = !!form && form.permissions.length === PERMISSION_GROUPS.length;

  return (
    <div>
      <PageHeader
        title="Usuários"
        subtitle="Quem pode acessar o painel administrativo e quais áreas cada pessoa vê"
        action={<Btn onClick={openCreate}>+ Novo usuário</Btn>}
      />

      <div style={{ background: '#F0F7FF', border: '1px solid #D0E3FF', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#344054', marginBottom: 14 }}>
        O acesso ao painel é feito com <b>conta Google</b>. Cadastre o e-mail Google da pessoa e marque as áreas:
        no primeiro login ela já entra com essas permissões, sem precisar de aprovação.
      </div>

      {pendingRequests > 0 && (
        <div style={{ background: '#FEF3F2', border: '1px solid #FECDCA', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#B42318', marginBottom: 14 }}>
          {pendingRequests === 1 ? '1 pessoa solicitou acesso' : `${pendingRequests} pessoas solicitaram acesso`} — marque as permissões na linha e clique em Salvar.
        </div>
      )}

      {err && <p style={{ color: BRAND.red, fontSize: 13, margin: '0 0 12px' }}>{err}</p>}
      {okMsg && <p style={{ color: BRAND.green, fontSize: 13, margin: '0 0 12px', fontWeight: 600 }}>✓ {okMsg}</p>}

      <Card style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <TableHead cols={['Usuário', 'Ativo', ...PERMISSION_GROUPS.map((g) => g.label), '']} />
          <tbody>
            {users.map((u) => {
              const isMaster = u.email === MASTER_ADMIN_EMAIL;
              const edit = edits[u.id];
              const status = statusOf(u);
              const dirty = isDirty(u);
              return (
                <tr key={u.id} style={{ borderTop: '1px solid #f0f2f4', background: dirty ? '#FFFCF0' : undefined }}>
                  <td style={{ padding: '10px 16px', minWidth: 220 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: BRAND.navy }}>{u.name}</span>
                      {status && (
                        <span title={status.hint} style={{ fontSize: 10, fontWeight: 700, color: status.color, background: status.bg, borderRadius: 999, padding: '2px 8px', whiteSpace: 'nowrap' }}>
                          {status.label}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: '#999' }}>{u.email}</div>
                  </td>
                  {isMaster ? (
                    <td colSpan={PERMISSION_GROUPS.length + 2} style={{ padding: '10px 16px', fontSize: 12, color: '#999', fontStyle: 'italic' }}>
                      Usuário mestre — acesso total, definido no .env
                    </td>
                  ) : (
                    <>
                      <td style={{ padding: '10px 16px' }}>
                        <input type="checkbox" aria-label={`${u.name} ativo`} checked={edit.active} onChange={() => toggleActive(u.id)} />
                      </td>
                      {PERMISSION_GROUPS.map((g) => (
                        <td key={g.key} style={{ padding: '10px 8px', textAlign: 'center' }}>
                          <input type="checkbox" aria-label={`${u.name}: ${g.label}`} checked={edit.permissions.includes(g.key)}
                            onChange={() => togglePermission(u.id, g.key)} />
                        </td>
                      ))}
                      {/* Ações fixas à direita: com muitas áreas a tabela rola na horizontal */}
                      <td style={{
                        padding: '10px 16px', whiteSpace: 'nowrap', position: 'sticky', right: 0,
                        background: dirty ? '#FFFCF0' : '#fff', boxShadow: '-8px 0 12px -10px rgba(0,0,0,.25)',
                      }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <Btn small onClick={() => save(u.id)} disabled={!dirty || savingId === u.id}>
                            {savingId === u.id ? 'Salvando...' : 'Salvar'}
                          </Btn>
                          <Btn small variant="ghost" onClick={() => openEdit(u)}>Editar</Btn>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {form && (
        <ModalShell title={form.id ? 'Editar usuário' : 'Novo usuário'} width={480} onClose={() => !formSaving && setForm(null)}>
          <Field label="Nome">
            <input style={inputStyle} value={form.name} maxLength={100} autoFocus placeholder="Ex.: Maria Souza"
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="E-mail da conta Google">
            <input style={{ ...inputStyle, background: form.id ? '#f6f7f9' : '#fff' }} type="email" value={form.email} maxLength={200}
              placeholder="maria@gmail.com" disabled={!!form.id} autoComplete="off"
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
              {form.id ? 'O e-mail não pode ser alterado — ele identifica a conta Google.' : 'A pessoa vai entrar no painel com “Entrar com Google” usando este e-mail.'}
            </div>
          </Field>

          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#666' }}>Áreas que pode acessar</span>
              <button type="button"
                onClick={() => setForm({ ...form, permissions: allSelected ? [] : PERMISSION_GROUPS.map((g) => g.key) })}
                style={{ border: 'none', background: 'none', color: BRAND.orange, fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                {allSelected ? 'Desmarcar todas' : 'Marcar todas'}
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {PERMISSION_GROUPS.map((g) => {
                const checked = form.permissions.includes(g.key);
                return (
                  <label key={g.key} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
                    border: `1.5px solid ${checked ? BRAND.orange : '#e4e7ec'}`, background: checked ? '#FFF4EE' : '#fff',
                    color: BRAND.navy, fontWeight: checked ? 700 : 500,
                  }}>
                    <input type="checkbox" checked={checked} onChange={() => toggleFormPermission(g.key)} />
                    {g.label}
                  </label>
                );
              })}
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#666', marginBottom: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            Ativo (desmarque para bloquear o acesso sem apagar as permissões)
          </label>

          {formErr && <p style={{ color: BRAND.red, fontSize: 13, margin: '0 0 12px' }}>{formErr}</p>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => setForm(null)} disabled={formSaving}>Cancelar</Btn>
            <Btn onClick={submitForm} disabled={formSaving}>{formSaving ? 'Salvando...' : form.id ? 'Salvar' : 'Cadastrar'}</Btn>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
