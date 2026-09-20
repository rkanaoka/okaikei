/**
 * API Client — Local-First
 * Sempre aponta para o servidor local (LAN).
 * Nunca depende de internet.
 */
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';
export const AUTH_TOKEN_KEY = 'bodogami_admin_token';

const http: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (r) => r.data,
  (err) => {
    const msg = err.response?.data?.message ?? err.message ?? 'Erro desconhecido';
    return Promise.reject(new Error(msg));
  },
);

// ── Autenticação / Usuários (Admin) ────────────────────────────────────────────
export type AuthUser = { id: string; name: string; email: string; role: string; permissions: string[] };
export type LoginResult = { pending: true } | { token: string; user: AuthUser };

export const authApi = {
  login:         (username: string, password: string) => http.post('/auth/login', { username, password }) as Promise<LoginResult>,
  loginFirebase: (idToken: string) => http.post('/auth/firebase', { idToken }) as Promise<LoginResult>,
  me:            () => http.get('/auth/me') as Promise<AuthUser>,
};

export const usersApi = {
  list:   () => http.get('/users') as Promise<Array<AuthUser & { active: boolean; adminPermissions: string[] }>>,
  update: (id: string, d: { active?: boolean; adminPermissions?: string[] }) => http.patch(`/users/${id}`, d),
};

// ── Menu ─────────────────────────────────────────────────────────────────────
export const menuApi = {
  list:    ()       => http.get('/menu'),
  listAll: ()       => http.get('/menu', { params: { all: 'true' } }),
  create:  (d: any) => http.post('/menu', d),
  update:  (id: string, d: any) => http.put(`/menu/${id}`, d),
  remove:  (id: string)         => http.delete(`/menu/${id}`),

  categories: {
    list:   () => http.get('/menu/categories'),
    create: (d: { name: string; sortOrder?: number }) => http.post('/menu/categories', d),
    update: (id: string, d: { name?: string; sortOrder?: number }) => http.put(`/menu/categories/${id}`, d),
  },
};

// ── Grupos de Opções (personalização de itens) ─────────────────────────────────
export const optionGroupsApi = {
  list:   ()       => http.get('/option-groups'),
  get:    (id: string) => http.get(`/option-groups/${id}`),
  create: (d: any)     => http.post('/option-groups', d),
  update: (id: string, d: any) => http.put(`/option-groups/${id}`, d),
  remove: (id: string)         => http.delete(`/option-groups/${id}`),
  setItems: (id: string, menuItemIds: string[]) => http.put(`/option-groups/${id}/items`, { menuItemIds }),
  updateOption: (optionId: string, d: { name?: string; price?: number; active?: boolean }) =>
    http.put(`/option-groups/options/${optionId}`, d),
};

// ── Tables ────────────────────────────────────────────────────────────────────
export const tablesApi = {
  list:   () => http.get('/tables'),
  create: (d: { type: 'MESA'|'BALCAO'|'MESA_EXTERNA'; number: number; capacity?: number }) => http.post('/tables', d),
  update: (id: string, d: Partial<{ type: 'MESA'|'BALCAO'|'MESA_EXTERNA'; number: number; capacity: number }>) =>
    http.put(`/tables/${id}`, d),
};

// ── Comandas / Orders ─────────────────────────────────────────────────────────
export const comandasApi = {
  list:  (status?: string) => http.get('/comandas', { params: status ? { status } : {} }),
  get:   (id: string)      => http.get(`/comandas/${id}`),

  open: (d: { tableId?: string; customerName?: string; notes?: string }) =>
    http.post('/comandas', d),

  addItems: (id: string, items: Array<{ menuItemId: string; quantity: number; notes?: string }>, print = true) =>
    http.post(`/comandas/${id}/items`, { items, print }),

  removeItem: (id: string, itemId: string, d: { reasonId: string; garcomId: string }) =>
    http.delete(`/comandas/${id}/items/${itemId}`, { data: d }),

  transferItems: (id: string, d: { itemIds: string[]; targetComandaId: string }) =>
    http.post(`/comandas/${id}/transfer-items`, d),

  changeTable: (id: string, d: { tableId: string }) => http.put(`/comandas/${id}/table`, d),

  mergeTable: (tableId: string) => http.post('/comandas/merge-table', { tableId }),

  printSummary: (id: string) => http.post(`/comandas/${id}/print-summary`, {}),

  pay: (id: string, d: {
    surchargeType?: string; surchargeValue?: number;
    discountType?:  string; discountValue?:  number;
    voucherId?:     string;
    partnershipId?: string;
    closedByGarcomId?: string;
    discountReasonId?: string;
    payments: Array<{ method: string; amount: number }>;
    printReceipt?: boolean;
  }) => http.post(`/comandas/${id}/pay`, d),
};

// ── Frente de Caixa ────────────────────────────────────────────────────────────
export const cashApi = {
  list: (d?: { from?: string; to?: string }) => http.get('/cash', { params: d }),

  current: () => http.get('/cash/current'),

  open: (d: { openingAmount: number; notes?: string }) => http.post('/cash/open', d),

  addMovement: (id: string, d: { type: 'WITHDRAWAL'|'REINFORCEMENT'; amount: number; notes?: string }) =>
    http.post(`/cash/${id}/movements`, d),

  summary: (id: string) => http.get(`/cash/${id}/summary`),

  close: (id: string, d: { closingCounts: Record<string, number>; notes?: string }) =>
    http.post(`/cash/${id}/close`, d),
};

// ── Motivos de Cancelamento / Desconto ─────────────────────────────────────────
export const reasonsApi = {
  cancellation: {
    list:    () => http.get('/reasons/cancellation'),
    create:  (d: { label: string }) => http.post('/reasons/cancellation', d),
    history: () => http.get('/reasons/cancellation/history'),
  },
  discount: {
    list:    () => http.get('/reasons/discount'),
    create:  (d: { label: string; type: 'percent'|'fixed'; value: number }) => http.post('/reasons/discount', d),
    history: () => http.get('/reasons/discount/history'),
  },
};

// ── Vouchers (Cupons de Desconto) ──────────────────────────────────────────────
export type VoucherInput = {
  customerName?: string; customerCpf?: string; customerBirthDate?: string;
  customerAddress?: string; customerPhone?: string; customerEmail?: string;
  discountType?: 'fixed' | 'percent'; amount: number;
  menuItemIds?: string[]; minOrderValue?: number; validDaysOfWeek?: number[];
  dueDate?: string; status?: string; code?: string;
};

export const vouchersApi = {
  list:   ()       => http.get('/vouchers'),
  create: (d: VoucherInput) => http.post('/vouchers', d),
  update: (id: string, d: Partial<VoucherInput>) => http.put(`/vouchers/${id}`, d),

  getByCode: (code: string) => http.get(`/vouchers/by-code/${encodeURIComponent(code)}`),
  confirm:   (id: string, password: string) => http.post(`/vouchers/${id}/confirm`, { password }),
  // Vouchers RECURRING: aplica sem senha, apenas checa validade
  useRecurring: (id: string) => http.post(`/vouchers/${id}/use-recurring`, {}),
  usageHistory: () => http.get('/vouchers/usage-history'),
};

// ── Parcerias (cupons de empresas parceiras) ────────────────────────────────────
export type CouponType = 'TWO_FOR_ONE_ITEM' | 'TWO_FOR_ONE_CATEGORY' | 'ITEM_DISCOUNT' | 'ORDER_DISCOUNT';

export type PartnershipCouponInput = {
  id?: string;
  type: CouponType;
  menuItemId?: string | null;
  categoryId?: string | null;
  discountType?: 'fixed' | 'percent' | null;
  amount?: number | null;
  minOrderValue?: number | null;
  active?: boolean;
};

export type PartnershipInput = {
  name: string;
  description?: string;
  responsible?: string;
  contact?: string;
  cnpj?: string;
  code: string;
  startDate?: string;
  endDate?: string;
  validDaysOfWeek?: number[];
  startTime?: string;
  endTime?: string;
  active?: boolean;
  coupons: PartnershipCouponInput[];
};

export const partnershipsApi = {
  list:   ()       => http.get('/partnerships'),
  create: (d: PartnershipInput) => http.post('/partnerships', d),
  update: (id: string, d: Partial<PartnershipInput>) => http.put(`/partnerships/${id}`, d),
  remove: (id: string) => http.delete(`/partnerships/${id}`),

  getByCode: (code: string) => http.get(`/partnerships/by-code/${encodeURIComponent(code)}`),
};

// ── Garçons ──────────────────────────────────────────────────────────────────
export type GarcomRow = { id: string; code: string; name: string; userId: string | null; active: boolean; user: { id: string; name: string; email: string } | null };

export const garconsApi = {
  list:   () => http.get('/garcons') as unknown as Promise<GarcomRow[]>,
  create: (d: { name: string; userId?: string | null }) => http.post('/garcons', d),
  update: (id: string, d: { name?: string; userId?: string | null; active?: boolean }) => http.patch(`/garcons/${id}`, d),

  getByCode: (code: string) => http.get(`/garcons/by-code/${encodeURIComponent(code)}`) as unknown as Promise<{ id: string; code: string; name: string }>,
};

// ── Modelos de Impressão ────────────────────────────────────────────────────────
export const printTemplatesApi = {
  list:   () => http.get('/print-templates'),
  get:    (type: string) => http.get(`/print-templates/${type}`),
  update: (type: string, d: { enabled?: boolean; config?: Record<string, any> }) =>
    http.put(`/print-templates/${type}`, d),
  reset:  (type: string) => http.post(`/print-templates/${type}/reset`, {}),
  test:   (type: string, d: { enabled?: boolean; config?: Record<string, any> }) =>
    http.post(`/print-templates/${type}/test`, d),
};

// ── Etiquetas de Validade (Controle de Estoque) ───────────────────────────────
export type EtiquetaValidadeInput = {
  produto: string; fabricante: string; lote: string; sif: string;
  dataManip: string; dataValidade: string; responsavel: string; quantidade: number;
};

export type EtiquetaLayoutConfig = {
  offsetX: number; offsetY: number;
  marginLeft: number; marginRight: number; marginTop: number; marginBottom: number;
  fontSizeProduto: number; fontSizeInfo: number; fontSizeValidade: number; fontSizeResponsavel: number;
  lineGap: number;
};

export const etiquetasApi = {
  status: () => http.get('/estoque/etiquetas/status'),
  print:  (d: EtiquetaValidadeInput) => http.post('/estoque/etiquetas/print', d),

  getLayout:   () => http.get('/estoque/etiquetas/layout') as Promise<EtiquetaLayoutConfig>,
  saveLayout:  (d: Partial<EtiquetaLayoutConfig>) => http.put('/estoque/etiquetas/layout', d) as Promise<EtiquetaLayoutConfig>,
  resetLayout: () => http.post('/estoque/etiquetas/layout/reset', {}) as Promise<EtiquetaLayoutConfig>,
  testLayout:  (etiqueta: EtiquetaValidadeInput, layout?: Partial<EtiquetaLayoutConfig>) =>
    http.post('/estoque/etiquetas/layout/test', { etiqueta, layout }) as Promise<{ ok: boolean; error?: string }>,
};

// ── Sync ──────────────────────────────────────────────────────────────────────
export const syncApi = {
  status: () => http.get('/sync/status'),
  flush:  () => http.post('/sync/flush'),
};

// ── Insumos (Controle de Estoque) ─────────────────────────────────────────────
export type UnidadeBase = 'MG' | 'ML' | 'UN';
export type UnidadeMedida = 'MG'|'G'|'KG'|'ML'|'L'|'UN'|'DUZIA'|'CAIXA'|'PACOTE'|'FARDO'|'OUTRO';
export type UnidadeInfo = { base: UnidadeBase; fatorFixo: number | null; label: string };

export type FornecedorDadosOpcionais = {
  nomeFantasia?: string | null; ie?: string | null; telefone?: string | null; email?: string | null;
  logradouro?: string | null; numero?: string | null; complemento?: string | null; bairro?: string | null;
  municipio?: string | null; uf?: string | null; cep?: string | null;
  representanteNome?: string | null; representanteTelefone?: string | null; representanteEmail?: string | null;
};

export type FornecedorRow = { id: string; nome: string; cnpj: string | null; active: boolean } & FornecedorDadosOpcionais;

export type NfeEmitenteParseado = {
  cnpj: string | null; nome: string | null; nomeFantasia: string | null; ie: string | null; telefone: string | null;
  logradouro: string | null; numero: string | null; complemento: string | null; bairro: string | null;
  municipio: string | null; uf: string | null; cep: string | null;
};

export type InsumoFornecedorItemRow = {
  id: string; insumoId: string; fornecedorId: string | null; marca: string | null;
  codigoFornecedor: string | null; unidadeCompra: UnidadeMedida; fatorConversao: string;
  ultimoPrecoUnitario: string | null; active: boolean;
  fornecedor: { id: string; nome: string; cnpj: string | null } | null;
};

export type InsumoRow = {
  id: string; name: string; categoria: string | null;
  categoriaId: string | null; subcategoriaId: string | null;
  categoriaRel: { id: string; nome: string } | null; subcategoriaRel: { id: string; nome: string } | null;
  unidadeBase: UnidadeBase;
  estoqueAtual: string; estoqueMinimo: string | null; active: boolean;
  itensFornecedor: InsumoFornecedorItemRow[];
};

export const fornecedoresApi = {
  list:   (all = false) => http.get('/estoque/fornecedores', { params: all ? { all: 'true' } : {} }) as Promise<FornecedorRow[]>,
  create: (d: { nome: string; cnpj?: string } & FornecedorDadosOpcionais) => http.post('/estoque/fornecedores', d),
  update: (id: string, d: Partial<{ nome: string; cnpj: string | null; active: boolean } & FornecedorDadosOpcionais>) =>
    http.put(`/estoque/fornecedores/${id}`, d),
  remove: (id: string) => http.delete(`/estoque/fornecedores/${id}`),
  parseNfe: (xml: string) => http.post('/estoque/fornecedores/nfe-emitente', { xml }) as Promise<NfeEmitenteParseado>,
};

// ── Categorias/Subcategorias de Insumo ────────────────────────────────────────
export type InsumoSubcategoriaRow = { id: string; categoriaId: string; nome: string; sortOrder: number; active: boolean };
export type InsumoCategoriaRow = { id: string; nome: string; sortOrder: number; active: boolean; subcategorias: InsumoSubcategoriaRow[] };

export const categoriasInsumoApi = {
  list:   (all = false) => http.get('/estoque/categorias', { params: all ? { all: 'true' } : {} }) as Promise<InsumoCategoriaRow[]>,
  create: (d: { nome: string }) => http.post('/estoque/categorias', d),
  update: (id: string, d: Partial<{ nome: string; sortOrder: number; active: boolean }>) => http.put(`/estoque/categorias/${id}`, d),
  createSubcategoria: (categoriaId: string, d: { nome: string }) => http.post(`/estoque/categorias/${categoriaId}/subcategorias`, d),
  updateSubcategoria: (id: string, d: Partial<{ nome: string; sortOrder: number; active: boolean }>) =>
    http.put(`/estoque/categorias/subcategorias/${id}`, d),
};

export const insumosApi = {
  unidadesMedida: () =>
    http.get('/estoque/insumos/unidades-medida') as Promise<Record<UnidadeMedida, UnidadeInfo>>,

  list:   (all = false) => http.get('/estoque/insumos', { params: all ? { all: 'true' } : {} }) as Promise<InsumoRow[]>,
  get:    (id: string) => http.get(`/estoque/insumos/${id}`) as Promise<InsumoRow>,
  create: (d: { name: string; categoria?: string; categoriaId?: string | null; subcategoriaId?: string | null; unidadeBase: UnidadeBase; estoqueMinimo?: number }) =>
    http.post('/estoque/insumos', d),
  update: (id: string, d: Partial<{ name: string; categoria: string | null; categoriaId: string | null; subcategoriaId: string | null; estoqueMinimo: number | null; active: boolean }>) =>
    http.put(`/estoque/insumos/${id}`, d),
  remove: (id: string) => http.delete(`/estoque/insumos/${id}`),

  addFornecedorItem: (insumoId: string, d: {
    fornecedorId?: string | null; marca?: string; codigoFornecedor?: string;
    unidadeCompra: UnidadeMedida; fatorConversao?: number; ultimoPrecoUnitario?: number;
  }) => http.post(`/estoque/insumos/${insumoId}/fornecedores`, d),

  updateFornecedorItem: (id: string, d: Partial<{
    fornecedorId: string | null; marca: string | null; codigoFornecedor: string | null;
    unidadeCompra: UnidadeMedida; fatorConversao: number; ultimoPrecoUnitario: number | null; active: boolean;
  }>) => http.put(`/estoque/insumos/fornecedores/${id}`, d),

  removeFornecedorItem: (id: string) => http.delete(`/estoque/insumos/fornecedores/${id}`),

  registrarEntrada: (insumoId: string, d: {
    fornecedorItemId?: string; quantidadeCompra: number; unidadeCompra?: UnidadeMedida;
    precoUnitario?: number; observacao?: string;
  }) => http.post(`/estoque/insumos/${insumoId}/entrada`, d),
};

// ── Importação de NF-e (XML) → Entrada de Estoque ─────────────────────────────
export type NfeItemPreview = {
  codigoFornecedor: string; descricao: string; unidadeComercial: string;
  unidadeSugerida: UnidadeMedida | null; quantidade: number; valorUnitario: number; valorTotal: number;
  vinculado: boolean; fornecedorItemId?: string; insumoId?: string; insumoNome?: string; unidadeBaseInsumo?: UnidadeBase;
};

export type NfePreviewResult = {
  chaveAcesso: string; numero: string | null; serie: string | null;
  dataEmissao: string | null; valorTotal: number | null;
  fornecedor: NfeEmitenteParseado;
  fornecedorCadastrado: boolean; jaImportada: boolean; itens: NfeItemPreview[];
};

export type NfeItemConfirmacao = {
  codigoFornecedor: string; descricao: string; unidadeComercial: string;
  quantidade: number; valorUnitario: number;
  insumoId?: string;
  criarInsumo?: { name: string; categoria?: string; unidadeBase: UnidadeBase; estoqueMinimo?: number | null };
  fornecedorItemId?: string;
  unidadeCompra?: UnidadeMedida;
  fatorConversao?: number;
  marca?: string;
};

export const nfeImportApi = {
  preview:   (xml: string) => http.post('/estoque/insumos/nfe/preview', { xml }) as Promise<NfePreviewResult>,
  confirmar: (xml: string, itens: NfeItemConfirmacao[]) => http.post('/estoque/insumos/nfe/confirmar', { xml, itens }),
};

export default http;
