import { useCallback, useEffect, useState } from 'react';
import { fiscalApi, FiscalDocument, FiscalIssue } from '@/services/api';
import { BRAND } from '@/pages/admin/shared';

export const FISCAL_STATUS_STYLE: Record<string, { label: string; color: string }> = {
  AUTORIZADO:       { label: 'Autorizada',            color: BRAND.green },
  PROCESSANDO:      { label: 'Processando',           color: BRAND.orange },
  PENDENTE:         { label: 'Pendente de envio',     color: BRAND.orange },
  ERRO_COMUNICACAO: { label: 'Falha de comunicação',  color: BRAND.red },
  REJEITADO:        { label: 'Rejeitada',             color: BRAND.red },
  PENDENCIA_FISCAL: { label: 'Cadastro fiscal incompleto', color: BRAND.red },
  CANCELADO:        { label: 'Cancelada',             color: '#888' },
};

/**
 * Bloco de NFC-e para uma comanda FECHADA (Caixa). Só aparece com o módulo fiscal ligado.
 * Emite/reemite manualmente (a emissão automática, quando ativa, ocorre no backend).
 */
export default function FiscalNfcePanel({ comandaId }: { comandaId: string }) {
  const [enabled, setEnabled] = useState(false);
  const [docs, setDocs]       = useState<FiscalDocument[]>([]);
  const [busy, setBusy]       = useState('');
  const [msg, setMsg]         = useState<{ ok: boolean; text: string } | null>(null);
  const [issues, setIssues]   = useState<FiscalIssue[]>([]);

  const load = useCallback(async () => {
    try {
      const st = await fiscalApi.status();
      setEnabled(st.enabled);
      if (st.enabled) setDocs(await fiscalApi.byComanda(comandaId));
    } catch { setEnabled(false); }
  }, [comandaId]);

  useEffect(() => { void load(); }, [load]);
  // Enquanto a nota estiver em processamento (ex.: emissão automática acabou de disparar), atualiza sozinho.
  useEffect(() => {
    const latest = docs[0];
    if (!enabled || !latest || !['PROCESSANDO', 'PENDENTE'].includes(latest.status)) return;
    const t = setInterval(() => void load(), 4000);
    return () => clearInterval(t);
  }, [enabled, docs, load]);

  if (!enabled) return null;
  const doc = docs[0];
  const st = doc ? FISCAL_STATUS_STYLE[doc.status] : null;

  async function run(label: string, fn: () => Promise<any>, okText: string) {
    setBusy(label); setMsg(null); setIssues([]);
    try {
      await fn();
      setMsg({ ok: true, text: okText });
    } catch (e: any) {
      setMsg({ ok: false, text: e.message });
      try { setIssues((await fiscalApi.preview(comandaId)).issues); } catch { /* sem detalhes */ }
    } finally {
      setBusy('');
      await load();
    }
  }

  const canEmit = !doc || ['REJEITADO', 'PENDENCIA_FISCAL', 'ERRO_COMUNICACAO', 'CANCELADO'].includes(doc.status);

  return (
    <div style={{ marginTop:14, paddingTop:12, borderTop:'1px solid #e8e2dc' }}>
      <div style={{ fontSize:12, fontWeight:700, color:'#888', marginBottom:8, textTransform:'uppercase', letterSpacing:.5 }}>
        NFC-e
      </div>

      {doc && st && (
        <div style={{ fontSize:13, marginBottom:8 }}>
          <span style={{ fontWeight:800, color:st.color }}>{st.label}</span>
          {doc.numero && <span style={{ color:'#666' }}> · nº {doc.numero} série {doc.serie}</span>}
          {doc.ambiente === 'homologacao' && <span style={{ color:BRAND.orange }}> · homologação</span>}
          {(doc.errorMessage || doc.mensagemSefaz) && doc.status !== 'AUTORIZADO' && (
            <div style={{ color:'#888', fontSize:12, marginTop:2 }}>{doc.errorMessage ?? doc.mensagemSefaz}</div>
          )}
        </div>
      )}

      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        {canEmit && (
          <MiniBtn disabled={!!busy} onClick={() => run('emit', () => fiscalApi.emit(comandaId), 'Solicitação enviada')}>
            {busy === 'emit' ? 'Emitindo…' : doc ? 'Reemitir NFC-e' : 'Emitir NFC-e'}
          </MiniBtn>
        )}
        {doc && ['PROCESSANDO', 'ERRO_COMUNICACAO', 'PENDENTE'].includes(doc.status) && (
          <MiniBtn disabled={!!busy} onClick={() => run('consult', () => fiscalApi.consult(doc.id), 'Situação atualizada')}>
            {busy === 'consult' ? 'Consultando…' : 'Consultar situação'}
          </MiniBtn>
        )}
        {doc?.status === 'AUTORIZADO' && (
          <MiniBtn disabled={!!busy} onClick={() => run('print', () => fiscalApi.print(doc.id), 'DANFE-NFC-e enviado à impressora')}>
            {busy === 'print' ? 'Imprimindo…' : '🖨 Imprimir DANFE-NFC-e'}
          </MiniBtn>
        )}
      </div>

      {msg && <p style={{ margin:'8px 0 0', fontSize:12, fontWeight:700, color: msg.ok ? BRAND.green : BRAND.red }}>{msg.text}</p>}
      {issues.length > 0 && (
        <ul style={{ margin:'6px 0 0', paddingLeft:18, fontSize:12, color: BRAND.red }}>
          {issues.map((i, k) => (
            <li key={k} style={{ color: i.severity === 'error' ? BRAND.red : BRAND.orange }}>
              {i.itemName ? `${i.itemName}: ` : ''}{i.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MiniBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      border:`1.5px solid ${BRAND.navy}`, background:'#fff', color:BRAND.navy, borderRadius:8,
      padding:'6px 12px', fontSize:12, fontWeight:700, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? .5 : 1,
      fontFamily:'inherit',
    }}>{children}</button>
  );
}
