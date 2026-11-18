import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError, AxiosInstance } from 'axios';
import { FiscalSettingsService } from '@/modules/fiscal/application/use-cases/fiscal-settings.service';
import { FocusNfePort, FocusResponse } from '@/modules/fiscal/application/contracts/focus-nfe.port';

/**
 * Cliente HTTP da Focus NFe (API v2). Rotas e contratos conforme https://doc.focusnfe.com.br.
 * Auth: HTTP Basic — token como usuário e senha vazia. O token vem do .env via FiscalSettingsService
 * e nunca é logado.
 */
@Injectable()
export class FocusNfeClient implements FocusNfePort {
  private readonly logger = new Logger(FocusNfeClient.name);

  constructor(private readonly settings: FiscalSettingsService) {}

  private async http(): Promise<{ http: AxiosInstance } | { error: FocusResponse }> {
    const s = await this.settings.getSettings();
    const token = this.settings.getToken(s.ambiente);
    if (!token) {
      return {
        error: {
          ok: false, kind: 'config', httpStatus: null, data: null, codigo: 'token_nao_configurado',
          mensagem: `Token da Focus NFe (${s.ambiente}) não configurado no servidor`,
        },
      };
    }
    return {
      http: axios.create({
        baseURL: this.settings.baseUrl(s.ambiente),
        timeout: s.timeoutMs,
        auth: { username: token, password: '' },
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        // Tratamos todos os status HTTP nós mesmos (a Focus devolve rejeição fiscal até com 2xx).
        validateStatus: () => true,
        responseType: 'text',
        transformResponse: (r) => r,
      }),
    };
  }

  private parse(raw: any): any {
    if (raw === undefined || raw === null || raw === '') return null;
    if (typeof raw !== 'string') return raw;
    try { return JSON.parse(raw); } catch { return null; }
  }

  private async call(method: 'get' | 'post' | 'delete', url: string, opts: { params?: any; body?: any } = {}): Promise<FocusResponse> {
    const built = await this.http();
    if ('error' in built) return built.error;
    try {
      const res = await built.http.request({ method, url, params: opts.params, data: opts.body });
      const data = this.parse(res.data);
      const status = res.status;
      if (status >= 200 && status < 300) return { ok: true, kind: 'none', httpStatus: status, data };
      return this.fromHttpError(status, data);
    } catch (err) {
      return this.fromException(err as AxiosError);
    }
  }

  private fromHttpError(status: number, data: any): FocusResponse {
    const base = {
      ok: false as const, httpStatus: status, data,
      codigo: data?.codigo, mensagem: data?.mensagem, erros: data?.erros,
    };
    if (status === 401) return { ...base, kind: 'auth', mensagem: 'Token da Focus NFe inválido ou sem acesso (HTTP 401)' };
    if (status === 403) return { ...base, kind: 'forbidden', mensagem: base.mensagem ?? 'CNPJ do emitente não autorizado' };
    if (status === 404) return { ...base, kind: 'not_found' };
    if (status === 400 || status === 415) return { ...base, kind: 'bad_request' };
    if (status === 422) return { ...base, kind: 'unprocessable' };
    if (status >= 500) return { ...base, kind: 'server', mensagem: base.mensagem ?? `Erro no servidor da Focus NFe (HTTP ${status})` };
    return { ...base, kind: 'bad_request' };
  }

  private fromException(err: AxiosError): FocusResponse {
    const code = err.code ?? '';
    // Não loga a config da requisição (contém o header Authorization).
    this.logger.warn(`Falha de comunicação com a Focus NFe: ${code || err.message}`);
    if (code === 'ECONNABORTED' || code === 'ETIMEDOUT' || /timeout/i.test(err.message)) {
      return { ok: false, kind: 'timeout', httpStatus: null, data: null, codigo: 'timeout', mensagem: 'A Focus NFe não respondeu a tempo' };
    }
    return {
      ok: false, kind: 'network', httpStatus: null, data: null, codigo: code || 'erro_rede',
      mensagem: 'Sem comunicação com a Focus NFe',
    };
  }

  // ── Operações NFC-e ──────────────────────────────────────────────────────

  /** POST /nfce?ref= — síncrono. Rejeição fiscal pode vir com HTTP 2xx: olhar `data.status`. */
  emitir(ref: string, payload: any, opts: { formaEmissao?: 'offline' } = {}) {
    return this.call('post', '/nfce', {
      params: { ref, ...(opts.formaEmissao ? { forma_emissao: opts.formaEmissao } : {}) },
      body: payload,
    });
  }

  /** GET /nfce/{ref}?completa= */
  consultar(ref: string, completa = false) {
    return this.call('get', `/nfce/${encodeURIComponent(ref)}`, { params: completa ? { completa: 1 } : undefined });
  }

  /** DELETE /nfce/{ref} — justificativa de 15 a 255 caracteres; prazo de 30 min após a emissão. */
  cancelar(ref: string, justificativa: string) {
    return this.call('delete', `/nfce/${encodeURIComponent(ref)}`, { body: { justificativa } });
  }

  /** POST /nfce/inutilizacao */
  inutilizar(body: { cnpj: string; serie: string; numero_inicial: string; numero_final: string; justificativa: string }) {
    return this.call('post', '/nfce/inutilizacao', { body });
  }

  /** POST /nfce/{ref}/email — até 10 destinatários. */
  enviarEmail(ref: string, emails: string[]) {
    return this.call('post', `/nfce/${encodeURIComponent(ref)}/email`, { body: { emails } });
  }

  /** Os caminhos devolvidos (XML/DANFE) são relativos ao host da Focus. */
  async absoluteUrl(path?: string | null): Promise<string | null> {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    const s = await this.settings.getSettings();
    return new URL(path, this.settings.baseUrl(s.ambiente)).toString();
  }
}
