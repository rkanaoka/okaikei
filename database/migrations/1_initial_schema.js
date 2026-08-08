/**
 * Bodogami — Frente de Caixa Offline
 * Migration 1: Schema inicial
 * node-pg-migrate
 */

exports.up = (pgm) => {
  // ─── Cardápio ────────────────────────────────────────────────────────────
  pgm.createTable('items', {
    id:          { type: 'serial', primaryKey: true },
    name:        { type: 'varchar(120)', notNull: true },
    description: { type: 'text' },
    price:       { type: 'numeric(10,2)', notNull: true },
    // 'cozinha' | 'bar' | 'caixa' — determina a impressora de destino
    category:    { type: 'varchar(30)', notNull: true, default: "'cozinha'" },
    subcategory: { type: 'varchar(60)' },
    available:   { type: 'boolean', notNull: true, default: true },
    sort_order:  { type: 'integer', notNull: true, default: 0 },
    created_at:  { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at:  { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('items', 'category');
  pgm.createIndex('items', 'available');

  // ─── Comandas ─────────────────────────────────────────────────────────────
  pgm.createTable('comandas', {
    id:              { type: 'serial', primaryKey: true },
    table_name:      { type: 'varchar(30)', notNull: true },
    customer_name:   { type: 'varchar(80)' },
    // 'open' | 'preparing' | 'closed'
    status:          { type: 'varchar(20)', notNull: true, default: "'open'" },
    surcharge_type:  { type: 'varchar(10)' },   // 'percent' | 'fixed' | null
    surcharge_value: { type: 'numeric(10,2)', default: 0 },
    discount_type:   { type: 'varchar(10)' },   // 'percent' | 'fixed' | null
    discount_value:  { type: 'numeric(10,2)', default: 0 },
    opened_at:       { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    closed_at:       { type: 'timestamptz' },
    notes:           { type: 'text' },
  });
  pgm.createIndex('comandas', 'status');

  // ─── Itens de comanda ─────────────────────────────────────────────────────
  pgm.createTable('comanda_items', {
    id:         { type: 'serial', primaryKey: true },
    comanda_id: { type: 'integer', notNull: true, references: '"comandas"', onDelete: 'CASCADE' },
    item_id:    { type: 'integer', notNull: true, references: '"items"', onDelete: 'RESTRICT' },
    quantity:   { type: 'integer', notNull: true, default: 1 },
    unit_price: { type: 'numeric(10,2)', notNull: true },
    notes:      { type: 'varchar(200)' },
    // 'pending' | 'sent' | 'ready' | 'delivered'
    status:     { type: 'varchar(20)', notNull: true, default: "'pending'" },
    sent_at:    { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('comanda_items', 'comanda_id');
  pgm.createIndex('comanda_items', 'status');

  // ─── Pagamentos ───────────────────────────────────────────────────────────
  pgm.createTable('payments', {
    id:         { type: 'serial', primaryKey: true },
    comanda_id: { type: 'integer', notNull: true, references: '"comandas"', onDelete: 'CASCADE' },
    // 'dinheiro' | 'cartao' | 'pix'
    method:     { type: 'varchar(20)', notNull: true },
    amount:     { type: 'numeric(10,2)', notNull: true },
    paid_at:    { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    notes:      { type: 'varchar(200)' },
  });
  pgm.createIndex('payments', 'comanda_id');

  // ─── Impressoras ──────────────────────────────────────────────────────────
  pgm.createTable('printers', {
    id:       { type: 'serial', primaryKey: true },
    category: { type: 'varchar(30)', notNull: true, unique: true },
    ip:       { type: 'varchar(45)', notNull: true },
    port:     { type: 'integer', notNull: true, default: 9100 },
    label:    { type: 'varchar(60)' },
    enabled:  { type: 'boolean', notNull: true, default: true },
  });

  pgm.sql(`
    INSERT INTO printers (category, ip, port, label) VALUES
      ('cozinha', '192.168.1.201', 9100, 'Impressora Cozinha'),
      ('bar',     '192.168.1.202', 9100, 'Impressora Bar'),
      ('caixa',   '192.168.1.203', 9100, 'Impressora Caixa');
  `);
};

exports.down = (pgm) => {
  pgm.dropTable('payments');
  pgm.dropTable('comanda_items');
  pgm.dropTable('comandas');
  pgm.dropTable('items');
  pgm.dropTable('printers');
};
