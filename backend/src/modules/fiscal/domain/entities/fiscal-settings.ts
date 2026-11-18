import type { RegimeTributario } from '@/modules/fiscal/domain/value-objects/fiscal-item-fields';

export type FiscalAmbiente = 'homologacao' | 'producao';

/** Configurações fiscais (persistidas em system_config, chave `fiscal_settings`). Sem segredos: o token fica no .env. */
export interface FiscalSettings {
  ambiente: FiscalAmbiente;
  cnpjEmitente: string;
  razaoSocial: string;
  nomeFantasia: string;
  inscricaoEstadual: string;
  /** Endereço em texto livre — usado só no cabeçalho do DANFE-NFC-e impresso. */
  endereco: string;
  regime: RegimeTributario;
  naturezaOperacao: string;
  /** Emite automaticamente (assíncrono) ao fechar a comanda. */
  autoEmit: boolean;
  printAfterAuthorize: boolean;
  /** Exige CST/classificação de IBS/CBS no item antes de emitir (confirmar vigência com o contador). */
  exigirIbsCbs: boolean;
  timeoutMs: number;
  /** código interno da forma de pagamento (CASH, PIX...) → `forma_pagamento` Focus (01, 03, 04, 17...). */
  paymentMethodMap: Record<string, string>;
}

// Defaults só de comportamento — nenhum dado tributário/cadastral é presumido.
export const DEFAULT_FISCAL_SETTINGS: FiscalSettings = {
  ambiente: 'homologacao',
  cnpjEmitente: '',
  razaoSocial: '',
  nomeFantasia: '',
  inscricaoEstadual: '',
  endereco: '',
  regime: 'simples',
  naturezaOperacao: 'VENDA AO CONSUMIDOR',
  autoEmit: true,
  printAfterAuthorize: true,
  exigirIbsCbs: false,
  timeoutMs: 30000,
  paymentMethodMap: {},
};

// Tabela oficial (tPag da NF-e) — usada só para validar o mapeamento informado no Admin.
export const FORMAS_PAGAMENTO_FOCUS: Record<string, string> = {
  '01': 'Dinheiro', '02': 'Cheque', '03': 'Cartão de crédito', '04': 'Cartão de débito',
  '05': 'Crédito loja', '10': 'Vale alimentação', '11': 'Vale refeição', '12': 'Vale presente',
  '13': 'Vale combustível', '15': 'Boleto bancário', '16': 'Depósito bancário', '17': 'PIX',
  '18': 'Transferência/carteira digital', '19': 'Programa de fidelidade', '90': 'Sem pagamento', '99': 'Outros',
};

export type FiscalDocumentStatus =
  | 'PENDENTE'          // criado, ainda não enviado
  | 'PENDENCIA_FISCAL'  // não enviado: cadastro fiscal incompleto (itens/pagamentos/emitente)
  | 'PROCESSANDO'       // Focus/SEFAZ ainda processando
  | 'AUTORIZADO'
  | 'REJEITADO'         // rejeição fiscal/validação (inclui denegado)
  | 'ERRO_COMUNICACAO'  // timeout/rede/servidor: resultado desconhecido → consultar antes de reenviar
  | 'CANCELADO';
