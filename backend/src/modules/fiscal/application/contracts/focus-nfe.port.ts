export const FOCUS_NFE_PORT = Symbol('FocusNfePort');

export type FocusErrorKind =
  | 'none'          // sucesso HTTP
  | 'auth'          // 401 (corpo HTML) — token inválido/ausente
  | 'forbidden'     // 403 permissao_negada
  | 'not_found'     // 404
  | 'bad_request'   // 400/415
  | 'unprocessable' // 422 (validação/regra/estado)
  | 'timeout'       // sem resposta: o resultado na SEFAZ é DESCONHECIDO
  | 'network'       // sem conexão/DNS/TLS: a requisição provavelmente nem chegou
  | 'server'        // 5xx
  | 'config';       // token não configurado — nenhuma chamada feita

export interface FocusResponse {
  ok: boolean;
  kind: FocusErrorKind;
  httpStatus: number | null;
  data: any;                 // corpo JSON (ou null)
  codigo?: string;           // codigo do erro Focus (ex.: erro_validacao_schema)
  mensagem?: string;
  erros?: Array<{ codigo?: string; mensagem?: string; campo?: string }>;
}

/** Porta da API Focus NFe (NFC-e). Implementação: infrastructure/api-clients/focus-nfe.client.ts */
export interface FocusNfePort {
  emitir(ref: string, payload: any, opts?: { formaEmissao?: 'offline' }): Promise<FocusResponse>;
  consultar(ref: string, completa?: boolean): Promise<FocusResponse>;
  cancelar(ref: string, justificativa: string): Promise<FocusResponse>;
  inutilizar(body: { cnpj: string; serie: string; numero_inicial: string; numero_final: string; justificativa: string }): Promise<FocusResponse>;
  enviarEmail(ref: string, emails: string[]): Promise<FocusResponse>;
  absoluteUrl(path?: string | null): Promise<string | null>;
}
