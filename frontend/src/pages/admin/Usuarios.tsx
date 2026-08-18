import { useState, useEffect } from 'react';
import { usersApi } from '@/services/api';
import { BRAND, Card, PageHeader, Btn, TableHead } from './shared';
import { PERMISSION_GROUPS } from './permissions';

const MASTER_ADMIN_EMAIL = 'admin@bodogami.com.br';

type Row = { id: string; name: string; email: string; role: string; active: boolean; adminPermissions: string[] };
type Edit = { active: boolean; permissions: string[] };

export default function Usuarios() {
  const [users, setUsers]     = useState<Row[]>([]);
  const [edits, setEdits]     = useState<Record<string, Edit>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [err, setErr]         = useState('');

  function load() {
    setLoading(true);
    usersApi.list()
      .then((data: any) => {
        setUsers(data);
        const next: Record<string, Edit> = {};
        data.forEach((u: Row) => { next[u.id] = { active: u.active, permissions: u.adminPermissions }; });
        setEdits(next);
      })
      .catch((e: any) => setErr('Erro ao carregar usuários: ' + e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function toggleActive(id: string) {
    setEdits(e => ({ ...e, [id]: { ...e[id], active: !e[id].active } }));
  }

  function togglePermission(id: string, key: string) {
    setEdits(e => {
      const current = e[id].permissions;
      const permissions = current.includes(key) ? current.filter(p => p !== key) : [...current, key];
      return { ...e, [id]: { ...e[id], permissions } };
    });
  }

  async function save(id: string) {
    setSavingId(id); setErr('');
    try {
      await usersApi.update(id, { active: edits[id].active, adminPermissions: edits[id].permissions });
      load();
    } catch (e: any) { setErr('Erro ao salvar: ' + e.message); }
    finally { setSavingId(''); }
  }

  if (loading) return <p style={{ color:'#aaa', fontSize:13 }}>Carregando...</p>;

  return (
    <div>
      <PageHeader title="Usuários" subtitle="Permissões de acesso ao painel administrativo" />
      {err && <p style={{ color:BRAND.red, fontSize:13, margin:'0 0 12px' }}>{err}</p>}
      <Card style={{ padding:0, overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <TableHead cols={['Usuário', 'Ativo', ...PERMISSION_GROUPS.map(g => g.label), '']} />
          <tbody>
            {users.map(u => {
              const isMaster = u.email === MASTER_ADMIN_EMAIL;
              const edit = edits[u.id];
              return (
                <tr key={u.id} style={{ borderTop:'1px solid #f0f2f4' }}>
                  <td style={{ padding:'10px 16px' }}>
                    <div style={{ fontWeight:700, fontSize:13, color:BRAND.navy }}>{u.name}</div>
                    <div style={{ fontSize:12, color:'#999' }}>{u.email}</div>
                  </td>
                  {isMaster ? (
                    <td colSpan={PERMISSION_GROUPS.length + 2} style={{ padding:'10px 16px', fontSize:12, color:'#999', fontStyle:'italic' }}>
                      Usuário mestre — acesso total, definido no .env
                    </td>
                  ) : (
                    <>
                      <td style={{ padding:'10px 16px' }}>
                        <input type="checkbox" checked={edit.active} onChange={() => toggleActive(u.id)} />
                      </td>
                      {PERMISSION_GROUPS.map(g => (
                        <td key={g.key} style={{ padding:'10px 16px', textAlign:'center' }}>
                          <input type="checkbox" checked={edit.permissions.includes(g.key)}
                            onChange={() => togglePermission(u.id, g.key)} />
                        </td>
                      ))}
                      <td style={{ padding:'10px 16px' }}>
                        <Btn small onClick={() => save(u.id)} disabled={savingId === u.id}>
                          {savingId === u.id ? 'Salvando...' : 'Salvar'}
                        </Btn>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
