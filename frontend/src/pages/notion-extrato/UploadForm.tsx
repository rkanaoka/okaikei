import { useRef, useState } from 'react';
import { BRAND } from '@/pages/admin/shared';
import { extratoApi } from './api';
import type { ExtratoParseResponse } from './types';

interface Props {
  onFileParsed: (data: ExtratoParseResponse | null) => void;
  disabled?: boolean;
}

export default function UploadForm({ onFileParsed, disabled }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | null | undefined) {
    if (!file) return;
    const name = file.name.toLowerCase();
    const isPdf = file.type === 'application/pdf' || name.endsWith('.pdf');
    const isXlsx = name.endsWith('.xlsx') || name.endsWith('.xls');

    if (!isPdf && !isXlsx) {
      setError('Envie um PDF (extrato Itaú) ou uma planilha .xlsx (extrato Santander).');
      return;
    }

    setError(null);
    setLoading(true);
    setFileName(file.name);

    try {
      const data = isPdf ? await extratoApi.parse(file) : await extratoApi.parseXlsx(file);
      onFileParsed(data);
    } catch (err: any) {
      setError(err.message);
      onFileParsed(null);
    } finally {
      setLoading(false);
    }
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    handleFile(e.dataTransfer.files?.[0]);
  }

  return (
    <div>
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        style={{
          border: `2px dashed ${isDragging ? BRAND.orange : '#d0d5dd'}`,
          borderRadius: 12,
          padding: '48px 20px',
          textAlign: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          background: isDragging ? '#fff6f0' : '#fafbfc',
          opacity: disabled ? 0.6 : 1,
          transition: 'border-color .15s, background .15s',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          hidden
          disabled={disabled}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <div style={{ fontSize: 40, marginBottom: 10 }}>🏦</div>
        <p style={{ margin: '0 0 4px', fontWeight: 800, color: BRAND.navy, fontSize: 15 }}>
          {loading ? 'Lendo extrato...' : 'Arraste o extrato mensal aqui'}
        </p>
        <p style={{ margin: 0, color: '#999', fontSize: 13 }}>
          {fileName ? fileName : 'ou clique para selecionar — PDF "Extrato Mensal" (Itaú) ou planilha .xlsx (Santander)'}
        </p>
      </div>
      {error && <p style={{ color: BRAND.red, fontSize: 13, marginTop: 10 }}>{error}</p>}
    </div>
  );
}
