import { useState, useEffect, useCallback } from 'react';
import { fornecedoresApi, FornecedorRow, FornecedorDadosOpcionais } from '@/services/api';
import { BRAND, Card, PageHeader, Btn, TableHead, ModalShell, Field, inputStyle } from './shared';

type Form = { id?: string; nome: string; cnpj: string } & FornecedorDadosOpcionais;

const FORM_VAZIO: Form = {
  nome: '', cnpj: '', nomeFantasia: '', ie: '', telefone: '', email: '',
  logradouro: '', numero: '', complemento: '', bairro: '', municipio: '', uf: '', cep: '',
  representanteNome: '', representanteTelefone: '', representanteEmail: '',
};

export default function Fornecedores() {
  const [fornecedores, setFornecedores] = useState<FornecedorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [importErr, setImportErr] = useState('');
  const [importando, setImportando] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setFornecedores(await fornecedoresApi.list(true)); }
    catch { /* noop */ }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function salvar() {
    if (!form?.nome.trim()) { setErr('Informe o nome/razão social do fornecedor.'); return; }
    setSaving(true); setErr('');
    const { id, ...dados } = form;
    const payload = { ...dados, cnpj: dados.cnpj.trim() || undefined };
    try {
      if (id) await fornecedoresApi.update(id, payload);
      else await fornecedoresApi.create(payload as any);
      await load(); setForm(null);
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  }

  async function alternarAtivo(f: FornecedorRow) {
    try {
      if (f.active) await fornecedoresApi.remove(f.id);
      else await fornecedoresApi.update(f.id, { active: true });
      await load();
    } catch (e: any) { alert(e.message); }
  }

  async function onImportarXml(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !form) return;
    setImportErr(''); setImportando(true);
    try {
      const xml = await file.text();
      const dados = await fornecedoresApi.parseNfe(xml);
      setForm({
        ...form,
        nome: dados.nome || form.nome,
        cnpj: dados.cnpj || form.cnpj,
        nomeFantasia: dados.nomeFantasia || form.nomeFantasia,
        ie: dados.ie || form.ie,
        telefone: dados.telefone || form.telefone,
        logradouro: dados.logradouro || form.logradouro,
        numero: dados.numero || form.numero,
        complemento: dados.complemento || form.complemento,
        bairro: dados.bairro || form.bairro,
        municipio: dados.municipio || form.municipio,
        uf: dados.uf || form.uf,
        cep: dados.cep || form.cep,
      });
    } catch (e: any) { setImportErr(e.message); }
    finally { setImportando(false); }
  }

  return (
    <div>
      <PageHeader
        title="Fornecedores"
        subtitle="Cadastro de fornecedores — dados da empresa, endereço e representante comercial"
        action={<Btn onClick={() => setForm({ ...FORM_VAZIO })}>+ Novo Fornecedor</Btn>}
      />

      {loading ? <p style={{ color: '#aaa', fontSize: 13 }}>Carregando...</p> : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <TableHead cols={['Nome', 'CNPJ', 'Telefone', 'E-mail', 'Representante', 'Status', '']} />
            <tbody>
              {fornecedores.length === 0 && (
                <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#ccc' }}>Nenhum fornecedor cadastrado</td></tr>
              )}
              {fornecedores.map(f => (
                <tr key={f.id} style={{ borderBottom: '1px solid #f5f5f5', opacity: f.active ? 1 : .5 }}>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: BRAND.navy }}>{f.nome}</td>
                  <td style={{ padding: '12px 16px', color: '#888' }}>{f.cnpj || '—'}</td>
                  <td style={{ padding: '12px 16px', color: '#888' }}>{f.telefone || '—'}</td>
                  <td style={{ padding: '12px 16px', color: '#888' }}>{f.email || '—'}</td>
                  <td style={{ padding: '12px 16px', color: '#888' }}>{f.representanteNome || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: f.active ? BRAND.green : '#999' }}>
                      {f.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                    <Btn small variant="ghost" onClick={() => setForm({ ...FORM_VAZIO, ...f, cnpj: f.cnpj || '' })}>Editar</Btn>{' '}
                    <Btn small variant={f.active ? 'danger' : 'secondary'} onClick={() => alternarAtivo(f)}>
                      {f.active ? 'Inativar' : 'Ativar'}
                    </Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {form && (
        <ModalShell title={form.id ? 'Editar Fornecedor' : 'Novo Fornecedor'} width={640} onClose={() => { setForm(null); setErr(''); setImportErr(''); }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'inline-block', padding: '9px 16px', borderRadius: 8, border: '1.5px dashed #ccc',
              fontSize: 12, fontWeight: 700, color: BRAND.navy, cursor: 'pointer',
            }}>
              {importando ? 'Lendo XML...' : '📄 Importar dados do XML da NF-e'}
              <input type="file" accept=".xml,text/xml" onChange={onImportarXml} style={{ display: 'none' }} disabled={importando} />
            </label>
            {importErr && <p style={{ color: BRAND.red, fontSize: 12, margin: '8px 0 0' }}>{importErr}</p>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
            <Field label="Nome / Razão Social">
              <input style={inputStyle} value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
            </Field>
            <Field label="Nome Fantasia">
              <input style={inputStyle} value={form.nomeFantasia || ''} onChange={e => setForm({ ...form, nomeFantasia: e.target.value })} />
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="CNPJ">
              <input style={inputStyle} value={form.cnpj} onChange={e => setForm({ ...form, cnpj: e.target.value })} placeholder="00.000.000/0000-00" />
            </Field>
            <Field label="Inscrição Estadual">
              <input style={inputStyle} value={form.ie || ''} onChange={e => setForm({ ...form, ie: e.target.value })} />
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Telefone">
              <input style={inputStyle} value={form.telefone || ''} onChange={e => setForm({ ...form, telefone: e.target.value })} />
            </Field>
            <Field label="E-mail">
              <input style={inputStyle} value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} />
            </Field>
          </div>

          <h3 style={{ margin: '4px 0 10px', fontSize: 13, fontWeight: 800, color: BRAND.navy }}>Endereço</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
            <Field label="Logradouro">
              <input style={inputStyle} value={form.logradouro || ''} onChange={e => setForm({ ...form, logradouro: e.target.value })} />
            </Field>
            <Field label="Número">
              <input style={inputStyle} value={form.numero || ''} onChange={e => setForm({ ...form, numero: e.target.value })} />
            </Field>
            <Field label="Complemento">
              <input style={inputStyle} value={form.complemento || ''} onChange={e => setForm({ ...form, complemento: e.target.value })} />
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 0.6fr 1fr', gap: 12 }}>
            <Field label="Bairro">
              <input style={inputStyle} value={form.bairro || ''} onChange={e => setForm({ ...form, bairro: e.target.value })} />
            </Field>
            <Field label="Município">
              <input style={inputStyle} value={form.municipio || ''} onChange={e => setForm({ ...form, municipio: e.target.value })} />
            </Field>
            <Field label="UF">
              <input style={inputStyle} maxLength={2} value={form.uf || ''} onChange={e => setForm({ ...form, uf: e.target.value.toUpperCase() })} />
            </Field>
            <Field label="CEP">
              <input style={inputStyle} value={form.cep || ''} onChange={e => setForm({ ...form, cep: e.target.value })} />
            </Field>
          </div>

          <h3 style={{ margin: '4px 0 10px', fontSize: 13, fontWeight: 800, color: BRAND.navy }}>Representante Comercial</h3>
          <Field label="Nome do representante">
            <input style={inputStyle} value={form.representanteNome || ''} onChange={e => setForm({ ...form, representanteNome: e.target.value })} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Telefone do representante">
              <input style={inputStyle} value={form.representanteTelefone || ''} onChange={e => setForm({ ...form, representanteTelefone: e.target.value })} />
            </Field>
            <Field label="E-mail do representante">
              <input style={inputStyle} value={form.representanteEmail || ''} onChange={e => setForm({ ...form, representanteEmail: e.target.value })} />
            </Field>
          </div>

          {err && <p style={{ color: BRAND.red, fontSize: 13, margin: '0 0 12px' }}>{err}</p>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => { setForm(null); setErr(''); setImportErr(''); }}>Cancelar</Btn>
            <Btn onClick={salvar} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Btn>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
