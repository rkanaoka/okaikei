// Layout configurável da etiqueta de código de barras (ZPL — Elgin L42 Pro Full, 480×240 dots).
// Compartilhado entre o CRUD de layout e o GerarEtiquetasBarcodeService (que monta o ZPL de fato).
// Mesmo padrão de etiqueta-layout-defaults.ts (etiqueta de validade), com sua própria chave.

export const ETIQUETA_BARCODE_LAYOUT_CONFIG_KEY = 'etiqueta_barcode_layout';

export interface EtiquetaBarcodeLayoutConfig {
  /** Nudge global (dots) — compensa desalinhamento do sensor de gap/tarja preta da impressora. */
  offsetX: number;
  offsetY: number;
  marginLeft: number;
  marginRight: number;
  marginTop: number;
  marginBottom: number;
  /** Tamanho da fonte do nome do insumo, acima do código de barras. */
  fontSizeNome: number;
  /** Altura do código de barras em dots. */
  barcodeHeight: number;
  /** Largura do módulo (barra mais fina) do código de barras, em dots — ^BY. */
  moduleWidth: number;
  /** Espaço vertical (dots) entre o nome e o código de barras. */
  lineGap: number;
  /** Exibe os dígitos legíveis abaixo do código de barras. */
  showCode: boolean;
}

export const DEFAULT_ETIQUETA_BARCODE_LAYOUT: EtiquetaBarcodeLayoutConfig = {
  offsetX: 0,
  offsetY: 0,
  marginLeft: 10,
  marginRight: 10,
  marginTop: 10,
  marginBottom: 10,
  fontSizeNome: 20,
  barcodeHeight: 100,
  moduleWidth: 3,
  lineGap: 8,
  showCode: true,
};

// Limites de sanidade — impedem configuração que gere ZPL inválido ou saia da etiqueta 60×30 mm.
export const ETIQUETA_BARCODE_LAYOUT_LIMITS: Record<Exclude<keyof EtiquetaBarcodeLayoutConfig, 'showCode'>, { min: number; max: number }> = {
  offsetX:        { min: -60, max: 60 },
  offsetY:        { min: -60, max: 60 },
  marginLeft:     { min: 0,   max: 100 },
  marginRight:    { min: 0,   max: 100 },
  marginTop:      { min: 0,   max: 100 },
  marginBottom:   { min: 0,   max: 100 },
  fontSizeNome:   { min: 8,   max: 60 },
  barcodeHeight:  { min: 20,  max: 180 },
  moduleWidth:    { min: 1,   max: 10 },
  lineGap:        { min: 0,   max: 40 },
};

export function sanitizeEtiquetaBarcodeLayout(partial: Partial<EtiquetaBarcodeLayoutConfig>): EtiquetaBarcodeLayoutConfig {
  const merged = { ...DEFAULT_ETIQUETA_BARCODE_LAYOUT, ...partial };
  const out = {} as EtiquetaBarcodeLayoutConfig;
  for (const k of Object.keys(ETIQUETA_BARCODE_LAYOUT_LIMITS) as (keyof typeof ETIQUETA_BARCODE_LAYOUT_LIMITS)[]) {
    const { min, max } = ETIQUETA_BARCODE_LAYOUT_LIMITS[k];
    const raw = Number(merged[k]);
    const safe = Number.isFinite(raw) ? raw : DEFAULT_ETIQUETA_BARCODE_LAYOUT[k];
    out[k] = Math.min(max, Math.max(min, Math.round(safe)));
  }
  out.showCode = merged.showCode !== undefined ? !!merged.showCode : DEFAULT_ETIQUETA_BARCODE_LAYOUT.showCode;
  return out;
}
