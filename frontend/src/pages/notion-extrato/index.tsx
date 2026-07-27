import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BRAND, Card, PageHeader, Btn } from '@/pages/admin/shared';
import UploadForm from './UploadForm';
import PreviewTable from './PreviewTable';
import { extratoApi } from './api';
import type { ExtratoParseResponse, ExtratoSyncResultItem } from './types';

export default function NotionExtrato() {
  const [notionConfigured, setNotionConfigured] = useState<boolean | null>(null);
  const [serviceUnreachable, setServiceUnreachable] = useState(false);
  const [parsed, setParsed] = useState<ExtratoParseResponse | null>(null);
  const [contaFinanceira, setContaFinanceira] = useState('Itaú');
  const [competencia, setCompetencia] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [results, setResults] = useState<ExtratoSyncResultItem[] | null>(null);

  useEffect(() => {
    extratoApi
      .health()
      .then((h) => setNotionConfigured(h.extratoNotionConfigured))
      .catch(() => {
        setServiceUnreachable(true);
        setNotionConfigured(false);
      });
  }, []);

  function handleParsed(data: ExtratoParseResponse | null) {
    setParsed(data);
    setResults(null);
    setSyncError(null);
    if (data) {
      setContaFinanceira(data.contaFinanceiraDefault);
      setCompetencia(data.competenciaDefault);
    }
  }

  async function handleSync() {
    if (!parsed?.transactions?.length) return;
    if (!contaFinanceira.trim() || !competencia.trim()) {
      setSyncError('Preencha "Conta Financeira" e "Competência de Exercício" antes de enviar.');
      return;
    }
    setSyncing(true);
    setSyncError(null);
    try {
      const data = await extratoApi.sync(parsed.transactions, contaFinanceira.trim(), competencia.trim());
      setResults(data.results);
    } catch (err: any) {
      setSyncError(err.message);
    } finally {
      setSyncing(false);
    }
  }

  const resultsByKey = results ? Object.fromEntries(results.map((r) => [r.chave, r])) : null;

  const summary = results
    ? {
        criado: results.filter((r) => r.status === 'criado').length,
        atualizado: results.filter((r) => r.status === 'atualizado').length,
        erro: results.filter((r) => r.status === 'erro').length,
      }
    : null;

  const totalEntradas = parsed ? parsed.transactions.reduce((s, r) => s + (r.entrada ?? 0), 0) : 0;
  const totalSaidas = parsed ? parsed.transactions.reduce((s, r) => s + (r.saida ?? 0), 0) : 0;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 36px', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      <div style={{ marginBottom: 8 }}>
        <Link to="/admin" style={{ color: '#999', fontSize: 12, textDecoration: 'none', fontWeight: 600 }}>
          ← Voltar ao Admin
        </Link>
      </div>

      <PageHeader
        title="Extrato Bancário → Notion"
        subtitle="Envie o extrato mensal (PDF Itaú ou planilha .xlsx Santander) e sincronize os lançamentos com o Notion"
      />

      {notionConfigured === false && serviceUnreachable && (
        <div style={{ background: '#fde8e8', border: '1px solid #eba8a8', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#7a1f1f' }}>
          Não foi possível conectar ao serviço notion-faturamento (porta 3002). Verifique se ele está rodando —{' '}
          <code>cd notion-faturamento/backend &amp;&amp; npm start</code> (veja <code>notion-faturamento/README.md</code>).
        </div>
      )}

      {notionConfigured === false && !serviceUnreachable && (
        <div style={{ background: '#fff4e0', border: '1px solid #f0c674', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#7a5b16' }}>
          O serviço ainda não tem <code>NOTION_EXTRATO_DATABASE_ID</code> configurado (veja{' '}
          <code>notion-faturamento/README.md</code>). Você pode analisar o extrato, mas o envio para o Notion vai
          falhar até isso ser configurado.
        </div>
      )}

      <Card style={{ marginBottom: 20 }}>
        <UploadForm onFileParsed={handleParsed} disabled={syncing} />
      </Card>

      {parsed && (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
            <div>
              <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: BRAND.navy }}>{parsed.fileName}</h2>
              <p style={{ margin: 0, color: '#888', fontSize: 13 }}>
                {parsed.periodo} · {parsed.transactions.length} lançamentos · entradas{' '}
                {totalEntradas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} · saídas{' '}
                {totalSaidas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
            <Btn onClick={handleSync} disabled={syncing}>
              {syncing ? 'Enviando...' : 'Enviar para o Notion'}
            </Btn>
          </div>

          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#666' }}>
              Conta Financeira
              <input
                value={contaFinanceira}
                onChange={(e) => setContaFinanceira(e.target.value)}
                disabled={syncing}
                style={{ display: 'block', marginTop: 4, padding: '7px 10px', borderRadius: 6, border: '1px solid #d0d5dd', fontSize: 13, width: 160 }}
              />
            </label>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#666' }}>
              Competência de Exercício
              <input
                value={competencia}
                onChange={(e) => setCompetencia(e.target.value)}
                disabled={syncing}
                placeholder="2026-01"
                style={{ display: 'block', marginTop: 4, padding: '7px 10px', borderRadius: 6, border: '1px solid #d0d5dd', fontSize: 13, width: 160 }}
              />
            </label>
          </div>

          {syncError && <p style={{ color: BRAND.red, fontSize: 13, marginBottom: 12 }}>{syncError}</p>}

          {summary && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <Badge label={`${summary.criado} criados`} bg="#e6f1ea" fg={BRAND.green} />
              <Badge label={`${summary.atualizado} atualizados`} bg="#e8eef5" fg="#33587d" />
              {summary.erro > 0 && <Badge label={`${summary.erro} com erro`} bg="#fbe9e5" fg={BRAND.red} />}
            </div>
          )}

          <PreviewTable rows={parsed.transactions} resultsByKey={resultsByKey} />
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
