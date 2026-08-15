// Layout configurável da etiqueta de validade (ZPL — Elgin L42 Pro Full, 480×240 dots).
// Compartilhado entre o CRUD de layout e o GerarEtiquetasValidadeService (que monta o ZPL de fato).

export const ETIQUETA_LAYOUT_CONFIG_KEY = 'etiqueta_validade_layout';

export interface EtiquetaLayoutConfig {
  /** Nudge global (dots) — compensa desalinhamento do sensor de gap/tarja preta da impressora. */
  offsetX: number;
  offsetY: number;
  marginLeft: number;
  marginRight: number;
  marginTop: number;
  marginBottom: number;
  fontSizeProduto: number;
  fontSizeInfo: number;       // Fab / SIF / Lote / Manip.
  fontSizeValidade: number;
  fontSizeResponsavel: number;
  /** Espaço vertical (dots) entre uma linha de texto e a próxima (ou separador). */
  lineGap: number;
}

export const DEFAULT_ETIQUETA_LAYOUT: EtiquetaLayoutConfig = {
  offsetX: 0,
  offsetY: 0,
  marginLeft: 10,
  marginRight: 10,
  marginTop: 8,
  marginBottom: 8,
  fontSizeProduto: 20,
  fontSizeInfo: 13,
  fontSizeValidade: 26,
  fontSizeResponsavel: 12,
  lineGap: 4,
};

// Limites de sanidade — impedem configuração que gere ZPL inválido ou saia da etiqueta 60×30 mm.
export const ETIQUETA_LAYOUT_LIMITS: Record<keyof EtiquetaLayoutConfig, { min: number; max: number }> = {
  offsetX:              { min: -60, max: 60 },
  offsetY:              { min: -60, max: 60 },
  marginLeft:           { min: 0,   max: 100 },
  marginRight:          { min: 0,   max: 100 },
  marginTop:            { min: 0,   max: 100 },
  marginBottom:         { min: 0,   max: 100 },
  fontSizeProduto:      { min: 8,   max: 60 },
  fontSizeInfo:         { min: 8,   max: 40 },
  fontSizeValidade:     { min: 8,   max: 60 },
  fontSizeResponsavel:  { min: 8,   max: 40 },
  lineGap:              { min: 0,   max: 40 },
};

export function sanitizeEtiquetaLayout(partial: Partial<EtiquetaLayoutConfig>): EtiquetaLayoutConfig {
  const merged = { ...DEFAULT_ETIQUETA_LAYOUT, ...partial };
  const out = {} as EtiquetaLayoutConfig;
  for (const k of Object.keys(DEFAULT_ETIQUETA_LAYOUT) as (keyof EtiquetaLayoutConfig)[]) {
    const { min, max } = ETIQUETA_LAYOUT_LIMITS[k];
    const raw = Number(merged[k]);
    const safe = Number.isFinite(raw) ? raw : DEFAULT_ETIQUETA_LAYOUT[k];
    out[k] = Math.min(max, Math.max(min, Math.round(safe)));
  }
  return out;
}
