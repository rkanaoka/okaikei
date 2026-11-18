export const FISCAL_REPOSITORY_PORT = Symbol('FiscalRepositoryPort');

export interface FiscalDocumentRecord {
  id: string;
  comandaId: string;
  ref: string;
  attempt: number;
  ambiente: string;
  status: string;
  trigger: string;
  focusStatus: string | null;
  statusSefaz: string | null;
  mensagemSefaz: string | null;
  chaveNfe: string | null;
  numero: string | null;
  serie: string | null;
  protocolo: string | null;
  qrcodeUrl: string | null;
  urlConsultaNf: string | null;
  caminhoXml: string | null;
  caminhoDanfe: string | null;
  total: any;
  requestPayload: any;
  responsePayload: any;
  errorMessage: string | null;
  printedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FiscalRepositoryPort {
  // ── Configuração (system_config) ─────────────────────────────────────────
  getConfig(key: string): Promise<any | null>;
  saveConfig(key: string, value: any): Promise<void>;

  // ── Leitura do PDV (somente leitura) ─────────────────────────────────────
  /** Comanda com itens (+ menuItem), pagamentos e mesa. */
  findComanda(comandaId: string): Promise<any | null>;
  listPaymentMethods(): Promise<Array<{ code: string; label: string; active: boolean }>>;
  /** Ids de comandas FECHADAS desde `since` que ainda não têm nenhum documento fiscal (rede de segurança do evento). */
  findClosedComandaIdsWithoutDocument(since: Date, limit: number): Promise<string[]>;

  // ── Classificação fiscal dos itens do cardápio ───────────────────────────
  listMenuItemsFiscal(): Promise<any[]>;
  findMenuItemFiscal(id: string): Promise<any | null>;
  updateMenuItemFiscal(id: string, data: Record<string, any>): Promise<any>;

  // ── Modelos fiscais (grupos de produtos) ─────────────────────────────────
  listTemplates(): Promise<any[]>;
  findTemplate(id: string): Promise<any | null>;
  createTemplate(data: { name: string; description: string | null; active: boolean; data: any }): Promise<any>;
  updateTemplate(id: string, data: Partial<{ name: string; description: string | null; active: boolean; data: any }>): Promise<any>;
  deleteTemplate(id: string): Promise<void>;
  /** Itens (com os campos fiscais) vinculados a um modelo. */
  findItemsByTemplate(templateId: string): Promise<any[]>;
  countItemsByTemplate(): Promise<Record<string, number>>;

  // ── Documentos fiscais ───────────────────────────────────────────────────
  createDocument(data: Record<string, any>): Promise<FiscalDocumentRecord>;
  updateDocument(id: string, data: Record<string, any>): Promise<FiscalDocumentRecord>;
  findDocumentById(id: string): Promise<FiscalDocumentRecord | null>;
  findDocumentByRef(ref: string): Promise<FiscalDocumentRecord | null>;
  findDocumentsByComanda(comandaId: string): Promise<FiscalDocumentRecord[]>; // mais recente primeiro
  /** Documentos não finalizados (PENDENTE/PROCESSANDO/ERRO_COMUNICACAO) atualizados antes de `before`. */
  findUnsettledDocuments(before: Date, limit: number): Promise<FiscalDocumentRecord[]>;
  listDocuments(filter: { status?: string; comandaId?: string; from?: Date; to?: Date; limit?: number }): Promise<FiscalDocumentRecord[]>;

  // ── Auditoria ────────────────────────────────────────────────────────────
  addAudit(data: {
    documentId?: string | null; comandaId?: string | null; action: string; actor: string;
    success: boolean; httpStatus?: number | null; detail?: any;
  }): Promise<void>;
  listAudit(filter: { documentId?: string; comandaId?: string; limit?: number }): Promise<any[]>;
}
