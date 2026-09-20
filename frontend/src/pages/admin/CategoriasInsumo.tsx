import { useState, useEffect, useCallback } from 'react';
import { categoriasInsumoApi, InsumoCategoriaRow, InsumoSubcategoriaRow } from '@/services/api';
import { BRAND, Card, PageHeader, Btn, TableHead, ModalShell, Field, inputStyle } from './shared';

export default function CategoriasInsumo() {
  const [categorias, setCategorias] = useState<InsumoCategoriaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<{ id?: string; nome: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [subcategoriasDe, setSubcategoriasDe] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setCategorias(await categoriasInsumoApi.list(true)); }
    catch { /* noop */ }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function salvar() {
    if (!form?.nome.trim()) { setErr('Informe o nome da categoria.'); return; }
    setSaving(true); setErr('');
    try {
      if (form.id) await categoriasInsumoApi.update(form.id, { nome: form.nome.trim() });
      else await categoriasInsumoApi.create({ nome: form.nome.trim() });
      await load(); setForm(null);
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  }

  async function alternarAtiva(c: InsumoCategoriaRow) {
    try { await categoriasInsumoApi.update(c.id, { active: !c.active }); await load(); }
    catch (e: any) { alert(e.message); }
  }

  async function handleDrop(idx: number) {
    setDragOverIndex(null);
    if (dragIndex === null || dragIndex === idx) { setDragIndex(null); return; }
    const reordered = [...categorias];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(idx, 0, moved);
    setDragIndex(null);
    setCategorias(reordered);
    setReordering(true);
    try {
      await Promise.all(reordered.map((c, i) => categoriasInsumoApi.update(c.id, { sortOrder: i })));
      await load();
    } catch (e: any) {
      alert(e.message);
      await load();
    } finally {
      setReordering(false);
    }
  }

  const categoriaSubcategorias = categorias.find(c => c.id === subcategoriasDe) || null;

  return (
    <div>
      <PageHeader
        title="Categorias de Insumos"
        subtitle="Organize os itens de estoque em categorias e subcategorias"
        action={<Btn onClick={() => setForm({ nome: '' })}>+ Nova Categoria</Btn>}
      />

      {loading ? <p style={{ color: '#aaa', fontSize: 13 }}>Carregando...</p> : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <p style={{ margin: 0, padding: '12px 16px', fontSize: 12, color: '#999', borderBottom: '1px solid #f5f5f5' }}>
            Arraste pelo ⠿ para reordenar.
            {reordering && <span style={{ color: BRAND.orange, fontWeight: 700 }}> Salvando…</span>}
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <TableHead cols={['', 'Nome', 'Subcategorias', 'Status', 'Ações']} />
            <tbody>
              {categorias.length === 0 && (
                <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#ccc' }}>Nenhuma categoria cadastrada</td></tr>
              )}
              {categorias.map((c, idx) => (
                <tr key={c.id}
                  draggable
                  onDragStart={() => setDragIndex(idx)}
                  onDragOver={e => { e.preventDefault(); if (idx !== dragOverIndex) setDragOverIndex(idx); }}
                  onDragEnd={() => setDragOverIndex(null)}
                  onDrop={() => handleDrop(idx)}
                  style={{
                    borderBottom: '1px solid #f5f5f5', opacity: c.active ? (dragIndex === idx ? 0.4 : 1) : 0.5,
                    background: dragOverIndex === idx ? '#FF6B2B12' : 'transparent',
                  }}>
                  <td style={{ padding: '12px 8px 12px 16px', width: 24, cursor: 'grab', color: '#ccc', fontSize: 16, userSelect: 'none' }}>⠿</td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: BRAND.navy }}>{c.nome}</td>
                  <td style={{ padding: '12px 16px', color: '#888' }}>
                    {c.subcategorias.filter(s => s.active).map(s => s.nome).join(', ') || '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: c.active ? BRAND.green : '#999' }}>
                      {c.active ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                    <Btn small variant="ghost" onClick={() => setSubcategoriasDe(c.id)}>Subcategorias</Btn>{' '}
                    <Btn small variant="ghost" onClick={() => setForm({ id: c.id, nome: c.nome })}>Editar</Btn>{' '}
                    <Btn small variant={c.active ? 'danger' : 'secondary'} onClick={() => alternarAtiva(c)}>
                      {c.active ? 'Inativar' : 'Ativar'}
                    </Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {form && (
        <ModalShell title={form.id ? 'Editar Categoria' : 'Nova Categoria'} onClose={() => { setForm(null); setErr(''); }}>
          <Field label="Nome">
            <input style={inputStyle} value={form.nome} placeholder="Ex: Bebidas, Grãos, Peixes"
              onChange={e => setForm({ ...form, nome: e.target.value })} />
          </Field>
          {err && <p style={{ color: BRAND.red, fontSize: 13, margin: '0 0 12px' }}>{err}</p>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => { setForm(null); setErr(''); }}>Cancelar</Btn>
            <Btn onClick={salvar} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Btn>
          </div>
        </ModalShell>
      )}

      {categoriaSubcategorias && (
        <SubcategoriasModal categoria={categoriaSubcategorias} onClose={() => setSubcategoriasDe(null)} onChanged={load} />
      )}
    </div>
  );
}

function SubcategoriasModal({ categoria, onClose, onChanged }: {
  categoria: InsumoCategoriaRow; onClose: () => void; onChanged: () => Promise<void> | void;
}) {
  const [form, setForm] = useState<{ id?: string; nome: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function salvar() {
    if (!form?.nome.trim()) return;
    setSaving(true); setErr('');
    try {
      if (form.id) await categoriasInsumoApi.updateSubcategoria(form.id, { nome: form.nome.trim() });
      else await categoriasInsumoApi.createSubcategoria(categoria.id, { nome: form.nome.trim() });
      setForm(null);
      await onChanged();
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  }

  async function alternarAtiva(s: InsumoSubcategoriaRow) {
    try { await categoriasInsumoApi.updateSubcategoria(s.id, { active: !s.active }); await onChanged(); }
    catch (e: any) { setErr(e.message); }
  }

  return (
    <ModalShell title={`Subcategorias — ${categoria.nome}`} onClose={onClose}>
      <div style={{ border: '1px solid #eee', borderRadius: 10, overflow: 'hidden', marginBottom: form ? 14 : 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <TableHead cols={['Nome', 'Status', '']} />
          <tbody>
            {categoria.subcategorias.length === 0 && (
              <tr><td colSpan={3} style={{ padding: '20px', textAlign: 'center', color: '#ccc' }}>Nenhuma subcategoria cadastrada</td></tr>
            )}
            {categoria.subcategorias.map(s => (
              <tr key={s.id} style={{ borderBottom: '1px solid #f5f5f5', opacity: s.active ? 1 : .5 }}>
                <td style={{ padding: '9px 12px' }}>{s.nome}</td>
                <td style={{ padding: '9px 12px', fontSize: 11, fontWeight: 700, color: s.active ? BRAND.green : '#999' }}>
                  {s.active ? 'Ativa' : 'Inativa'}
                </td>
                <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>
                  <Btn small variant="ghost" onClick={() => setForm({ id: s.id, nome: s.nome })}>Editar</Btn>{' '}
                  <Btn small variant={s.active ? 'danger' : 'secondary'} onClick={() => alternarAtiva(s)}>
                    {s.active ? 'Inativar' : 'Ativar'}
                  </Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form ? (
        <div style={{ background: '#f8f9fa', borderRadius: 10, padding: 16 }}>
          <Field label="Nome da subcategoria">
            <input style={inputStyle} value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
          </Field>
          {err && <p style={{ color: BRAND.red, fontSize: 13, margin: '8px 0 0' }}>{err}</p>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
            <Btn small variant="ghost" onClick={() => { setForm(null); setErr(''); }}>Cancelar</Btn>
            <Btn small onClick={salvar} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Btn>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Btn small variant="secondary" onClick={() => setForm({ nome: '' })}>+ Adicionar Subcategoria</Btn>
        </div>
      )}
    </ModalShell>
  );
}
