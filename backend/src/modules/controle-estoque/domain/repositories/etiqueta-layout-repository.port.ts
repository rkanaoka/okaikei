export const ETIQUETA_LAYOUT_REPOSITORY_PORT = Symbol('EtiquetaLayoutRepositoryPort');

export interface EtiquetaLayoutRepositoryPort {
  /** Retorna o layout salvo (parcial ou completo) ou null se nunca foi configurado. */
  find(): Promise<Record<string, any> | null>;

  /** Substitui o layout salvo por completo. */
  save(config: Record<string, any>): Promise<void>;
}
