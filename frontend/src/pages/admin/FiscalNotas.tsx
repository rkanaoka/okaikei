import { useEffect, useState } from 'react';
import { fiscalApi, FiscalDocument } from '@/services/api';
import { FISCAL_STATUS_STYLE } from '@/components/FiscalNfcePanel';
import { BRAND, Card, PageHeader, Btn, Field, ModalShell, TableHead, fmtBRL, fmtDate, inputStyle } from './shared';

type Dialog =
  | { kind: 'detail'; doc: FiscalDocument }
  | { kind: 'cancel'; doc: FiscalDocument }
  | { kind: 'email'; doc: FiscalDocument }
  | { kind: 'inutiliza' }
  | null;

export default function FiscalNotas() {
  const [docs, setDocs]       = useState<FiscalDocument[]>([]);
  const [status, setStatus]   = useState('');
  const [loading, setLoading] = useState(true);
  const [dlg, setDlg]         = useState<Dialog>(null);
  const [text, setText]       = useState('');           // justificativa / e-mails
  const [inut, setInut]       = useState({ serie: '1', ini: '', fim: '' });
  const [busy, setBusy]       = useState(false);
  const [err, setErr]         = useState('');
  const [ok, setOk]           = useState('');

  async function load() {
    setLoading(true);
    try { setDocs(await fiscalApi.documents({ status: status || undefined, limit: 200 })); setErr(''); }
    catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [status]);

  async function act(fn: () => Promise<any>, okText: string, closeAfter = true) {
    setBusy(true); setErr(''); setOk('');
    try { await fn(); setOk(okText); if (closeAfter) setDlg(null); await load(); }
    catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function openDetail(doc: FiscalDocument) {
    setErr(''); setOk('');
    try { setDlg({ kind: 'detail', doc: await fiscalApi.document(doc.id) }); }
    catch (e: any) { setErr(e.message); }
  }

  const closeDlg = () => { setDlg(null); setText(''); setErr(''); };

  return (
    <div>
      <PageHeader title="Fiscal — Notas emitidas" subtitle="NFC-e geradas, situação na SEFAZ e ações"
        action={<Btn variant="ghost" onClick={() => { setErr(''); setDlg({ kind: 'inutiliza' }); }}>Inutilizar numeração</Btn>} />

      <div style={{ display:'flex', gap:12, marginBottom:14, alignItems:'center' }}>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ ...inputStyle, width:240 }}>
          <option value="">Todas as situações</option>
          {Object.entries(FISCAL_STATUS_STYLE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <Btn small variant="ghost" onClick={load}>Atualizar</Btn>
      </div>

      {!dlg && err && <p style={{ color:BRAND.red, fontSize:13 }}>{err}</p>}
      {!dlg && ok && <p style={{ color:BRAND.green, fontSize:13, fontWeight:700 }}>{ok}</p>}

      {loading ? <p style={{ color:'#aaa', fontSize:13 }}>Carregando...</p> : (
        <Card style={{ padding:0, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <TableHead cols={['Data', 'Nº / Série', 'Total', 'Ambiente', 'Situação', '']} />
            <tbody>
              {docs.length === 0 && <tr><td colSpan={6} style={{ padding:40, textAlign:'center', color:'#ccc' }}>Nenhuma nota</td></tr>}
              {docs.map((d) => {
                const st = FISCAL_STATUS_STYLE[d.status] ?? { label: d.status, color: '#888' };
                return (
                  <tr key={d.id} style={{ borderBottom:'1px solid #f5f5f5' }}>
                    <td style={{ padding:'10px 16px', color:'#666' }}>{fmtDate(d.createdAt)}</td>
                    <td style={{ padding:'10px 16px', fontFamily:'monospace' }}>{d.numero ?? '—'} / {d.serie ?? '—'}</td>
                    <td style={{ padding:'10px 16px', fontWeight:700 }}>{fmtBRL(d.total)}</td>
                    <td style={{ padding:'10px 16px', color: d.ambiente === 'producao' ? BRAND.navy : BRAND.orange }}>
                      {d.ambiente === 'producao' ? 'Produção' : 'Homologação'}
                    </td>
                    <td style={{ padding:'10px 16px' }}>
                      <span style={{ fontWeight:800, color:st.color }}>{st.label}</span>
                      {(d.errorMessage) && <div style={{ fontSize:11, color:'#999', maxWidth:360 }}>{d.errorMessage.slice(0, 140)}</div>}
                    </td>
                    <td style={{ padding:'10px 16px', textAlign:'right' }}>
                      <Btn small variant="ghost" onClick={() => openDetail(d)}>Detalhes</Btn>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {dlg?.kind === 'detail' && (() => {
        const d = dlg.doc;
        const st = FISCAL_STATUS_STYLE[d.status] ?? { label: d.status, color: '#888' };
        return (
          <ModalShell title={`NFC-e ${d.numero ?? '(sem número)'}`} width={680} onClose={closeDlg}>
            <div style={{ fontSize:13, lineHeight:1.7 }}>
              <div><b>Situação:</b> <span style={{ color:st.color, fontWeight:800 }}>{st.label}</span> {d.statusSefaz && <span style={{ color:'#888' }}>(SEFAZ {d.statusSefaz})</span>}</div>
              {d.mensagemSefaz && <div><b>Mensagem:</b> {d.mensagemSefaz}</div>}
              {d.errorMessage && <div style={{ color:BRAND.red }}><b>Erro:</b> {d.errorMessage}</div>}
              {d.chaveNfe && <div><b>Chave:</b> <span style={{ fontFamily:'monospace', fontSize:12 }}>{d.chaveNfe}</span></div>}
              {d.protocolo && <div><b>Protocolo:</b> {d.protocolo}</div>}
              <div><b>Referência:</b> <span style={{ fontFamily:'monospace' }}>{d.ref}</span> · origem: {d.trigger === 'auto' ? 'automática' : 'manual'}</div>
              <div style={{ display:'flex', gap:12, marginTop:4 }}>
                {d.xmlUrl && <a href={d.xmlUrl} target="_blank" rel="noreferrer">XML</a>}
                {d.danfeUrl && <a href={d.danfeUrl} target="_blank" rel="noreferrer">DANFE (HTML)</a>}
                {d.urlConsultaNf && <a href={d.urlConsultaNf} target="_blank" rel="noreferrer">Consulta pública</a>}
              </div>
            </div>

            {err && <p style={{ color:BRAND.red, fontSize:13 }}>{err}</p>}
            {ok && <p style={{ color:BRAND.green, fontSize:13, fontWeight:700 }}>{ok}</p>}
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', margin:'14px 0' }}>
              <Btn small variant="ghost" disabled={busy}
                onClick={() => act(async () => setDlg({ kind: 'detail', doc: { ...(await fiscalApi.consult(d.id)), historico: undefined } as any }), 'Situação atualizada', false)}>
                Consultar na Focus
              </Btn>
              {d.status === 'AUTORIZADO' && <Btn small variant="ghost" disabled={busy} onClick={() => act(() => fiscalApi.print(d.id), 'Enviado à impressora', false)}>Imprimir DANFE-NFC-e</Btn>}
              {d.status === 'AUTORIZADO' && <Btn small variant="ghost" onClick={() => { setErr(''); setText(''); setDlg({ kind: 'email', doc: d }); }}>Enviar por e-mail</Btn>}
              {d.status === 'AUTORIZADO' && <Btn small variant="danger" onClick={() => { setErr(''); setText(''); setDlg({ kind: 'cancel', doc: d }); }}>Cancelar nota</Btn>}
              {['REJEITADO', 'PENDENCIA_FISCAL', 'ERRO_COMUNICACAO', 'CANCELADO'].includes(d.status) && (
                <Btn small disabled={busy} onClick={() => act(() => fiscalApi.emit(d.comandaId), 'Emissão solicitada', false)}>Reemitir</Btn>
              )}
            </div>

            <div style={{ fontSize:12, fontWeight:700, color:'#888', textTransform:'uppercase', margin:'8px 0 6px' }}>Histórico</div>
            <div style={{ maxHeight:200, overflowY:'auto', fontSize:12, borderTop:'1px solid #eee' }}>
              {(d.historico ?? []).map((h: any) => (
                <div key={h.id} style={{ padding:'6px 0', borderBottom:'1px solid #f5f5f5' }}>
                  <span style={{ color:'#999' }}>{fmtDate(h.createdAt)}</span> · <b>{h.action}</b> · {h.actor} ·{' '}
                  <span style={{ color: h.success ? BRAND.green : BRAND.red }}>{h.success ? 'ok' : 'falha'}</span>
                  {h.detail?.mensagem && <span style={{ color:'#777' }}> — {String(h.detail.mensagem).slice(0, 120)}</span>}
                </div>
              ))}
              {(d.historico ?? []).length === 0 && <div style={{ padding:'8px 0', color:'#bbb' }}>Sem registros</div>}
            </div>
          </ModalShell>
        );
      })()}

      {dlg?.kind === 'cancel' && (
        <ModalShell title="Cancelar NFC-e" width={480} onClose={closeDlg}>
          <p style={{ fontSize:12, color:'#888', marginTop:0 }}>
            O cancelamento só é aceito pela SEFAZ até 30 minutos após a emissão. Ação irreversível.
          </p>
          <Field label="Justificativa (15 a 255 caracteres)">
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={255} style={{ ...inputStyle, resize:'vertical' }} />
          </Field>
          {err && <p style={{ color:BRAND.red, fontSize:13 }}>{err}</p>}
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
            <Btn variant="ghost" onClick={closeDlg}>Voltar</Btn>
            <Btn variant="danger" disabled={busy || text.trim().length < 15}
              onClick={() => act(() => fiscalApi.cancel(dlg.doc.id, text.trim()), 'Nota cancelada')}>
              {busy ? 'Cancelando...' : 'Confirmar cancelamento'}
            </Btn>
          </div>
        </ModalShell>
      )}

      {dlg?.kind === 'email' && (
        <ModalShell title="Enviar NFC-e por e-mail" width={460} onClose={closeDlg}>
          <Field label="E-mails (separados por vírgula, no máximo 10)">
            <input value={text} onChange={(e) => setText(e.target.value)} style={inputStyle} placeholder="cliente@exemplo.com" />
          </Field>
          {err && <p style={{ color:BRAND.red, fontSize:13 }}>{err}</p>}
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
            <Btn variant="ghost" onClick={closeDlg}>Voltar</Btn>
            <Btn disabled={busy || !text.trim()}
              onClick={() => act(() => fiscalApi.email(dlg.doc.id, text.split(/[,;\s]+/).filter(Boolean)), 'E-mail solicitado')}>
              {busy ? 'Enviando...' : 'Enviar'}
            </Btn>
          </div>
        </ModalShell>
      )}

      {dlg?.kind === 'inutiliza' && (
        <ModalShell title="Inutilizar numeração" width={460} onClose={closeDlg}>
          <p style={{ fontSize:12, color:'#888', marginTop:0 }}>
            Use somente para numeração que foi pulada e não será usada. Operação perante a SEFAZ, irreversível.
          </p>
          <div style={{ display:'flex', gap:12 }}>
            <Field label="Série"><input value={inut.serie} onChange={(e) => setInut({ ...inut, serie: e.target.value })} style={{ ...inputStyle, width:80 }} /></Field>
            <Field label="Número inicial"><input value={inut.ini} inputMode="numeric" onChange={(e) => setInut({ ...inut, ini: e.target.value })} style={{ ...inputStyle, width:130 }} /></Field>
            <Field label="Número final"><input value={inut.fim} inputMode="numeric" onChange={(e) => setInut({ ...inut, fim: e.target.value })} style={{ ...inputStyle, width:130 }} /></Field>
          </div>
          <Field label="Justificativa (mín. 15 caracteres)">
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={255} style={{ ...inputStyle, resize:'vertical' }} />
          </Field>
          {err && <p style={{ color:BRAND.red, fontSize:13 }}>{err}</p>}
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
            <Btn variant="ghost" onClick={closeDlg}>Voltar</Btn>
            <Btn variant="danger" disabled={busy || text.trim().length < 15 || !inut.ini || !inut.fim}
              onClick={() => act(() => fiscalApi.inutilizar({ serie: inut.serie, numeroInicial: Number(inut.ini), numeroFinal: Number(inut.fim), justificativa: text.trim() }), 'Numeração inutilizada')}>
              {busy ? 'Enviando...' : 'Inutilizar'}
            </Btn>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
