-- Formas de pagamento passam de enum fixo para tabela cadastrável.

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "code" VARCHAR(30) NOT NULL,
    "label" VARCHAR(60) NOT NULL,
    "description" VARCHAR(200),
    "color" VARCHAR(9) NOT NULL DEFAULT '#999999',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_code_key" ON "payment_methods"("code");

-- Formas que existiam no enum (mesmos rótulos/cores usados no frontend)
INSERT INTO "payment_methods" ("code", "label", "description", "color", "sort_order", "updated_at") VALUES
    ('CASH',    'Dinheiro',                'Aceite pagamentos em espécie',  '#2DC653', 1, CURRENT_TIMESTAMP),
    ('CARD',    'Cartão (débito/crédito)', 'Via maquininha',                '#5c6bc0', 2, CURRENT_TIMESTAMP),
    ('PIX',     'Pix',                     'Transferência instantânea',     '#00bfa5', 3, CURRENT_TIMESTAMP),
    ('VOUCHER', 'Voucher',                 'Vale-refeição e alimentação',   '#FF6B2B', 4, CURRENT_TIMESTAMP);

-- AlterTable: o enum vira texto preservando os valores existentes
ALTER TABLE "payments" ALTER COLUMN "method" TYPE VARCHAR(30) USING "method"::text;

-- DropEnum
DROP TYPE "PaymentMethod";
