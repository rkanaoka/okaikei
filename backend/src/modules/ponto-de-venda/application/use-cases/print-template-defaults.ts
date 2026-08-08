// Configurações padrão dos modelos de impressão térmica.
// Compartilhado entre o CRUD de templates e o PrintingService (que aplica os campos de fato).

export const TEMPLATE_TYPES = ['kitchen', 'bar', 'receipt', 'fiscal'] as const;
export type TemplateType = typeof TEMPLATE_TYPES[number];

export const TEMPLATE_LABELS: Record<TemplateType, string> = {
  kitchen: 'Pedido — Cozinha',
  bar:     'Pedido — Bar',
  receipt: 'Fechamento de Conta',
  fiscal:  'Cupom Fiscal',
};

export const DEFAULT_ENABLED: Record<TemplateType, boolean> = {
  kitchen: true,
  bar:     true,
  receipt: true,
  fiscal:  false, // não há emissão fiscal real integrada — desligado por padrão
};

export const DEFAULT_CONFIGS: Record<TemplateType, Record<string, any>> = {
  kitchen: {
    footerText:      '',
    cutMode:         'partial',
    showComanda:     true,
    showCliente:     true,
    showObservacoes: true,
    showGarcom:      true,
  },
  bar: {
    footerText:      '',
    cutMode:         'partial',
    showComanda:     true,
    showCliente:     true,
    showObservacoes: true,
    showGarcom:      true,
  },
  receipt: {
    storeName:       'BODOGAMI',
    headerText:      'Restaurante Japonês',
    showEndereco:    false,
    endereco:        '',
    showTaxaServico: true,
    showDesconto:    true,
    showAssinatura:  false,
    footerText:      'Obrigado pela visita! @bodogami',
    cutMode:         'full',
  },
  fiscal: {
    razaoSocial: 'Bodogami Ltda',
    cnpj:        '00.000.000/0001-00',
    endereco:    '',
    footerText:  'Documento sem valor fiscal — emissão simplificada',
    cutMode:     'full',
  },
};

export function isTemplateType(v: string): v is TemplateType {
  return (TEMPLATE_TYPES as readonly string[]).includes(v);
}
