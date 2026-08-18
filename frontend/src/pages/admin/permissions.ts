// Mesmas 7 chaves usadas em backend/src/modules/auth/domain/permission-groups.ts —
// sem pacote compartilhado entre backend e frontend, mantidas em sincronia manualmente.
export const PERMISSION_GROUPS: { key: string; label: string }[] = [
  { key: 'dashboard',       label: 'Dashboard' },
  { key: 'cardapio',        label: 'Cardápio' },
  { key: 'financeiro',      label: 'Financeiro' },
  { key: 'relacionamentos', label: 'Relacionamentos' },
  { key: 'relatorios',      label: 'Relatórios' },
  { key: 'estoque',         label: 'Estoque' },
  { key: 'configuracoes',   label: 'Configurações' },
];
