import { useEffect, useState } from 'react';
import { fiscalApi, FiscalDocument, comandasApi } from '@/services/api';
import { FISCAL_STATUS_STYLE } from '@/components/FiscalNfcePanel';
import { useAuth } from '@/store/AuthContext';
import { usePaymentMethods } from '@/hooks/usePaymentMethods';
import {
  BRAND, Card, PageHeader, Btn, Field, ModalShell, TableHead, fmtBRL, fmtDate, inputStyle,
  getTotal, toSPDateStr, navigateAdmin,
} from './shared';

type Filters = { from: string; to: string; destinatario: string; numero: string };
const EMPTY_FILTERS: Filters = { from: '', to: '', destinatario: '', numero: '' };
const LIMIT = 200;

/** Máscara progressiva: até 11 dígitos = CPF, acima = CNPJ. */
function maskCpfCnpj(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 14);
  if (d.length <= 11) {
    return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
}

type ComandaRef = NonNullable<FiscalDocument['comanda']>;

function comandaLabel(c: ComandaRef) {
  return `Comanda #${c.number}${c.tableLabel ? ` · ${c.tableLabel}` : ''}`;
}

type Dialog =
  | { kind: 'detail'; doc: FiscalDocument }
  | { kind: 'order'; ref: ComandaRef; comanda: any | null }
  | { kind: 'cancel'; doc: FiscalDocument }
  | { kind: 'email'; doc: FiscalDocument }
  | { kind: 'inutiliza' }
  | null;

export default function FiscalNotas() {
  const { user } = useAuth();
  const { labelOf } = usePaymentMethods();
  const canOpenOrders = !!user && (user.role === 'ADMIN' || user.permissions.includes('relatorios'));
  const [docs, setDocs]       = useState<FiscalDocument[]>([]);
  const [status, setStatus]   = useState('');
  const [draft, setDraft]     = useState<Filters>(EMPTY_FILTERS);   // o que está digitado
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);   // o que foi aplicado
  const [loading, setLoading] = useState(true);
  const [dlg, setDlg]         = useState<Dialog>(null);
  const [text, setText]       = useState('');           // justificativa / e-mails
  const [inut, setInut]       = useState({ serie: '1', ini: '', fim: '' });
  const [busy, setBusy]       = useState(false);
  const [err, setErr]         = useState('');
  const [ok, setOk]           = useState('');

  async function load() {
    setLoading(true);
    try {
      setDocs(await fiscalApi.documents({
        status:       status || undefined,
        from:         filters.from || undefined,
        to:           filters.to || undefined,
        destinatario: filters.destinatario.replace(/\D/g, '') || undefined,
        numero:       filters.numero.trim() || undefined,
        limit:        LIMIT,
      }));
      setErr('');
    }
    catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [status, filters]);

  function applyFilters(e?: React.FormEvent) {
    e?.preventDefault();
    const digits = draft.destinatario.replace(/\D/g, '');
    if (digits && digits.length !== 11 && digits.length !== 14) {
      setErr('Informe o CPF (11 dígitos) ou CNPJ (14 dígitos) completo.'); return;
    }
    if (draft.from && draft.to && draft.from > draft.to) {
      setErr('A data inicial não pode ser depois da data final.'); return;
    }
    setOk('');
    setFilters({ ...draft });
  }

  function clearFilters() {
    setDraft(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
    setStatus('');
    setErr('');
  }

  const hasFilters = !!(status || filters.from || filters.to || filters.destinatario || filters.numero);

  async function openOrder(ref: ComandaRef) {
    setErr(''); setOk('');
    setDlg({ kind: 'order', ref, comanda: null });
    try {
      const comanda = await comandasApi.get(ref.id);
      setDlg((d) => (d?.kind === 'order' && d.ref.id === ref.id ? { ...d, comanda } : d));
    } catch (e: any) { setErr(e.message); }
  }

  function goToOrders(ref: ComandaRef) {
    navigateAdmin({ section: 'rel-pedidos', comandaId: ref.id, date: toSPDateStr(ref.closedAt ?? ref.openedAt) });
  }

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

      <Card style={{ marginBottom: 14 }}>
        <form onSubmit={applyFilters} style={{ display:'flex', gap:12, alignItems:'flex-end', flexWrap:'wrap' }}>
          <label style={{ fontSize:12, fontWeight:700, color:'#666' }}>
            Data inicial
            <input type="date" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })}
              style={{ ...inputStyle, width:150, display:'block', marginTop:5 }} />
          </label>
          <label style={{ fontSize:12, fontWeight:700, color:'#666' }}>
            Data final
            <input type="date" value={draft.to} min={draft.from || undefined} onChange={(e) => setDraft({ ...draft, to: e.target.value })}
              style={{ ...inputStyle, width:150, display:'block', marginTop:5 }} />
          </label>
          <label style={{ fontSize:12, fontWeight:700, color:'#666' }}>
            Destinatário (CPF/CNPJ)
            <input value={draft.destinatario} inputMode="numeric" placeholder="000.000.000-00"
              onChange={(e) => setDraft({ ...draft, destinatario: maskCpfCnpj(e.target.value) })}
              style={{ ...inputStyle, width:190, display:'block', marginTop:5 }} />
          </label>
          <label style={{ fontSize:12, fontWeight:700, color:'#666' }}>
            Nº do cupom
            <input value={draft.numero} inputMode="numeric" placeholder="Ex.: 123"
              onChange={(e) => setDraft({ ...draft, numero: e.target.value.replace(/\D/g, '').slice(0, 9) })}
              style={{ ...inputStyle, width:110, display:'block', marginTop:5 }} />
          </label>
          <label style={{ fontSize:12, fontWeight:700, color:'#666' }}>
            Situação
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ ...inputStyle, width:190, display:'block', marginTop:5 }}>
              <option value="">Todas</option>
              {Object.entries(FISCAL_STATUS_STYLE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </label>
          <div style={{ display:'flex', gap:8, marginLeft:'auto' }}>
            <Btn small onClick={() => applyFilters()}>Filtrar</Btn>
            {hasFilters && <Btn small variant="ghost" onClick={clearFilters}>Limpar</Btn>}
            <Btn small variant="ghost" onClick={load}>Atualizar</Btn>
          </div>
          {/* Enter em qualquer campo aplica os filtros */}
          <button type="submit" style={{ display:'none' }} aria-hidden="true" tabIndex={-1} />
        </form>
      </Card>

      {!loading && docs.length > 0 && (
        <div style={{ fontSize:12, color:'#888', margin:'0 0 8px' }}>
          {docs.length} {docs.length === 1 ? 'nota' : 'notas'}
          {docs.length >= LIMIT ? ` (mostrando as ${LIMIT} mais recentes — refine os filtros)` : ''}
        </div>
      )}

      {!dlg && err && <p style={{ color:BRAND.red, fontSize:13 }}>{err}</p>}
      {!dlg && ok && <p style={{ color:BRAND.green, fontSize:13, fontWeight:700 }}>{ok}</p>}

      {loading ? <p style={{ color:'#aaa', fontSize:13 }}>Carregando...</p> : (
        <Card style={{ padding:0, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <TableHead cols={['Data', 'Nº / Série', 'Pedido', 'Destinatário', 'Total', 'Ambiente', 'Situação', '']} />
            <tbody>
              {docs.length === 0 && (
                <tr><td colSpan={8} style={{ padding:40, textAlign:'center', color:'#ccc' }}>
                  {hasFilters ? 'Nenhuma nota encontrada com esses filtros' : 'Nenhuma nota'}
                </td></tr>
              )}
              {docs.map((d) => {
                const st = FISCAL_STATUS_STYLE[d.status] ?? { label: d.status, color: '#888' };
                return (
                  <tr key={d.id} style={{ borderBottom:'1px solid #f5f5f5' }}>
                    <td style={{ padding:'10px 16px', color:'#666' }}>{fmtDate(d.createdAt)}</td>
                    <td style={{ padding:'10px 16px', fontFamily:'monospace' }}>{d.numero ?? '—'} / {d.serie ?? '—'}</td>
                    <td style={{ padding:'10px 16px' }}>
                      {d.comanda ? (
                        <button type="button" onClick={() => openOrder(d.comanda!)} title="Ver o pedido desta nota"
                          style={{ background:'none', border:'none', padding:0, cursor:'pointer', color:BRAND.orange, fontWeight:700, fontSize:13, textDecoration:'underline', textAlign:'left' }}>
                          {comandaLabel(d.comanda)}
                        </button>
                      ) : <span style={{ color:'#bbb' }}>Pedido removido</span>}
                      {d.comanda?.customerName && <div style={{ fontSize:11, color:'#999' }}>{d.comanda.customerName}</div>}
                    </td>
                    <td style={{ padding:'10px 16px', fontFamily: d.destinatario ? 'monospace' : undefined, color: d.destinatario ? BRAND.navy : '#bbb', whiteSpace:'nowrap' }}>
                      {d.destinatario ? maskCpfCnpj(d.destinatario) : 'Não identificado'}
                    </td>
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
              {(() => {
                const ref = docs.find((x) => x.id === d.id)?.comanda;
                return ref ? (
                  <div><b>Pedido:</b>{' '}
                    <button type="button" onClick={() => openOrder(ref)}
                      style={{ background:'none', border:'none', padding:0, cursor:'pointer', color:BRAND.orange, fontWeight:700, fontSize:13, textDecoration:'underline' }}>
                      {comandaLabel(ref)}
                    </button>
                  </div>
                ) : null;
              })()}
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

      {dlg?.kind === 'order' && (() => {
        const { ref, comanda: c } = dlg;
        const items = (c?.items ?? []).filter((i: any) => i.status !== 'CANCELLED');
        return (
          <ModalShell title={comandaLabel(ref)} width={560} onClose={closeDlg}>
            <div style={{ fontSize:13, color:'#666', marginBottom:12 }}>
              {ref.customerName && <span><b>Cliente:</b> {ref.customerName} · </span>}
              <b>Aberta:</b> {fmtDate(ref.openedAt)}
              {ref.closedAt && <> · <b>Fechada:</b> {fmtDate(ref.closedAt)}</>}
            </div>
            {err && <p style={{ color:BRAND.red, fontSize:13 }}>{err}</p>}
            {!c && !err && <p style={{ color:'#aaa', fontSize:13 }}>Carregando pedido...</p>}
            {c && (
              <>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                  <tbody>
                    {items.map((i: any) => (
                      <tr key={i.id} style={{ borderBottom:'1px solid #f3f3f3' }}>
                        <td style={{ padding:'6px 0', width:36, color:'#888' }}>{i.quantity}×</td>
                        <td style={{ padding:'6px 0', color:BRAND.navy, fontWeight:600 }}>
                          {i.menuItem?.name ?? i.name}
                          {i.notes && <div style={{ fontSize:11, color:'#999', fontWeight:400 }}>{i.notes}</div>}
                        </td>
                        <td style={{ padding:'6px 0', textAlign:'right' }}>{fmtBRL(Number(i.unitPrice) * i.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ display:'flex', justifyContent:'space-between', marginTop:12, fontSize:13, gap:12 }}>
                  <span style={{ color:'#666' }}>
                    {(c.payments ?? []).map((p: any) => `${labelOf(p.method)} ${fmtBRL(p.amount)}`).join(' · ') || 'Sem pagamentos'}
                  </span>
                  <span style={{ fontWeight:900, color:BRAND.navy, whiteSpace:'nowrap' }}>Total {fmtBRL(getTotal(c))}</span>
                </div>
              </>
            )}
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:18 }}>
              <Btn variant="ghost" onClick={closeDlg}>Fechar</Btn>
              {canOpenOrders && <Btn onClick={() => { closeDlg(); goToOrders(ref); }}>Abrir em Pedidos →</Btn>}
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
