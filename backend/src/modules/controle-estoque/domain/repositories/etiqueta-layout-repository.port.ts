export const ETIQUETA_LAYOUT_REPOSITORY_PORT = Symbol('EtiquetaLayoutRepositoryPort');

// Persistência genérica de layouts de etiqueta (key/value) — cada tipo de etiqueta
// (validade, código de barras, ...) usa sua própria chave.
export interface EtiquetaLayoutRepositoryPort {
  /** Retorna o layout salvo (parcial ou completo) para a chave, ou null se nunca foi configurado. */
  find(key: string): Promise<Record<string, any> | null>;

  /** Substitui o layout salvo para a chave por completo. */
  save(key: string, config: Record<string, any>): Promise<void>;
}
