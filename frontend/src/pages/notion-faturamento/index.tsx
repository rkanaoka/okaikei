import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BRAND, Card, PageHeader, Btn } from '@/pages/admin/shared';
import UploadForm from './UploadForm';
import PreviewTable from './PreviewTable';
import { notionFaturamentoApi } from './api';
import type { ParseResponse, SyncResultItem } from './types';

export default function NotionFaturamento() {
  const [notionConfigured, setNotionConfigured] = useState<boolean | null>(null);
  const [serviceUnreachable, setServiceUnreachable] = useState(false);
  const [parsed, setParsed] = useState<ParseResponse | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [results, setResults] = useState<SyncResultItem[] | null>(null);

  useEffect(() => {
    notionFaturamentoApi
      .health()
      .then((h) => setNotionConfigured(h.notionConfigured))
      .catch(() => { setServiceUnreachable(true); setNotionConfigured(false); });
  }, []);

  function handleParsed(data: ParseResponse | null) {
    setParsed(data);
    setResults(null);
    setSyncError(null);
  }

  async function handleSync() {
    if (!parsed?.rows?.length) return;
    setSyncing(true);
    setSyncError(null);
    try {
      const data = await notionFaturamentoApi.sync(parsed.rows);
      setResults(data.results);
    } catch (err: any) {
      setSyncError(err.message);
    } finally {
      setSyncing(false);
    }
  }

  const resultsByDate = results
    ? Object.fromEntries(results.map((r) => [r.data, r]))
    : null;

  const summary = results
    ? {
        criado: results.filter((r) => r.status === 'criado').length,
        atualizado: results.filter((r) => r.status === 'atualizado').length,
        erro: results.filter((r) => r.status === 'erro').length,
      }
    : null;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 36px', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      <div style={{ marginBottom: 8 }}>
        <Link to="/admin" style={{ color: '#999', fontSize: 12, textDecoration: 'none', fontWeight: 600 }}>
          ← Voltar ao Admin
        </Link>
      </div>

      <PageHeader
        title="Faturamento SAIPOS → Notion"
        subtitle='Envie o PDF mensal de "Faturamento por dia" e sincronize com sua database do Notion'
      />

      {notionConfigured === false && serviceUnreachable && (
        <div
          style={{
            background: '#fde8e8',
            border: '1px solid #eba8a8',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 20,
            fontSize: 13,
            color: '#7a1f1f',
          }}
        >
          Não foi possível conectar ao serviço notion-faturamento (porta 3002). Verifique se ele está rodando —
          <code> cd notion-faturamento/backend &amp;&amp; npm start</code> (veja <code>notion-faturamento/README.md</code>).
        </div>
      )}

      {notionConfigured === false && !serviceUnreachable && (
        <div
          style={{
            background: '#fff4e0',
            border: '1px solid #f0c674',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 20,
            fontSize: 13,
            color: '#7a5b16',
          }}
        >
          O serviço notion-faturamento ainda não tem <code>NOTION_TOKEN</code> / <code>NOTION_DATABASE_ID</code>{' '}
          configurados (veja <code>notion-faturamento/README.md</code>). Você pode analisar PDFs, mas o envio para o
          Notion vai falhar até isso ser configurado.
        </div>
      )}

      {notionConfigured === null && (
        <div style={{ fontSize: 13, color: '#999', marginBottom: 16 }}>
          Verificando conexão com o serviço notion-faturamento (porta 3002)...
        </div>
      )}

      <Card style={{ marginBottom: 20 }}>
        <UploadForm onFileParsed={handleParsed} disabled={syncing} />
      </Card>

      {parsed && (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 12 }}>
            <div>
              <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: BRAND.navy }}>{parsed.fileName}</h2>
              <p style={{ margin: 0, color: '#888', fontSize: 13 }}>
                {parsed.loja ? `Loja: ${parsed.loja} · ` : ''}
                {parsed.rows.length} dias encontrados
              </p>
            </div>
            <Btn onClick={handleSync} disabled={syncing}>
              {syncing ? 'Enviando...' : 'Enviar para o Notion'}
            </Btn>
          </div>

          {syncError && <p style={{ color: BRAND.red, fontSize: 13, marginBottom: 12 }}>{syncError}</p>}

          {summary && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <Badge label={`${summary.criado} criados`} bg="#e6f1ea" fg={BRAND.green} />
              <Badge label={`${summary.atualizado} atualizados`} bg="#e8eef5" fg="#33587d" />
              {summary.erro > 0 && <Badge label={`${summary.erro} com erro`} bg="#fbe9e5" fg={BRAND.red} />}
            </div>
          )}

          <PreviewTable rows={parsed.rows} resultsByDate={resultsByDate} />
        </Card>
      )}
    </div>
  );
}

function Badge({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: bg, color: fg }}>
      {label}
    </span>
  );
}
