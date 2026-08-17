export const PERMISSION_GROUPS = [
  'dashboard', 'cardapio', 'financeiro', 'relacionamentos', 'relatorios', 'estoque', 'configuracoes',
] as const;

export type PermissionGroup = typeof PERMISSION_GROUPS[number];

export const MASTER_ADMIN_EMAIL = 'admin@bodogami.com.br';
