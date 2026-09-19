-- CreateEnum
CREATE TYPE "CouponType" AS ENUM ('TWO_FOR_ONE_ITEM', 'TWO_FOR_ONE_CATEGORY', 'ITEM_DISCOUNT', 'ORDER_DISCOUNT');

-- CreateEnum
CREATE TYPE "UnidadeBase" AS ENUM ('MG', 'ML', 'UN');

-- CreateEnum
CREATE TYPE "UnidadeMedida" AS ENUM ('MG', 'G', 'KG', 'ML', 'L', 'UN', 'DUZIA', 'CAIXA', 'PACOTE', 'FARDO', 'OUTRO');

-- CreateEnum
CREATE TYPE "MovimentacaoTipo" AS ENUM ('ENTRADA', 'SAIDA', 'AJUSTE');

-- CreateEnum
CREATE TYPE "MovimentacaoOrigem" AS ENUM ('MANUAL', 'NFE');

-- CreateEnum
CREATE TYPE "NotaFiscalStatus" AS ENUM ('PROCESSADA', 'ERRO');

-- AlterTable
ALTER TABLE "comandas" ADD COLUMN     "partnership_code" VARCHAR(20),
ADD COLUMN     "partnership_discount" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "vouchers" ADD COLUMN     "discount_type" VARCHAR(10) NOT NULL DEFAULT 'fixed',
ADD COLUMN     "menu_item_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "min_order_value" DECIMAL(10,2),
ADD COLUMN     "valid_days_of_week" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ALTER COLUMN "customer_name" DROP NOT NULL,
ALTER COLUMN "customer_cpf" DROP NOT NULL,
ALTER COLUMN "customer_birth_date" DROP NOT NULL,
ALTER COLUMN "customer_address" DROP NOT NULL,
ALTER COLUMN "customer_phone" DROP NOT NULL,
ALTER COLUMN "customer_email" DROP NOT NULL;

-- CreateTable
CREATE TABLE "partnerships" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "responsible" VARCHAR(150),
    "contact" VARCHAR(150),
    "cnpj" VARCHAR(20),
    "code" VARCHAR(20) NOT NULL,
    "start_date" DATE,
    "end_date" DATE,
    "valid_days_of_week" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "start_time" VARCHAR(5),
    "end_time" VARCHAR(5),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partnerships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partnership_coupons" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "partnership_id" UUID NOT NULL,
    "type" "CouponType" NOT NULL,
    "menu_item_id" UUID,
    "category_id" UUID,
    "discount_type" VARCHAR(10),
    "amount" DECIMAL(10,2),
    "min_order_value" DECIMAL(10,2),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partnership_coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fornecedores" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "nome" VARCHAR(150) NOT NULL,
    "cnpj" VARCHAR(20),
    "telefone" VARCHAR(20),
    "email" VARCHAR(200),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fornecedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insumo_itens" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "name" VARCHAR(150) NOT NULL,
    "categoria" VARCHAR(60),
    "unidade_base" "UnidadeBase" NOT NULL,
    "estoque_atual" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "estoque_minimo" DECIMAL(14,3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insumo_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insumo_fornecedor_itens" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "insumo_id" UUID NOT NULL,
    "fornecedor_id" UUID,
    "marca" VARCHAR(100),
    "codigo_fornecedor" VARCHAR(60),
    "unidade_compra" "UnidadeMedida" NOT NULL,
    "fator_conversao" DECIMAL(14,4) NOT NULL,
    "ultimo_preco_unitario" DECIMAL(12,4),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insumo_fornecedor_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentacoes_estoque" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "insumo_id" UUID NOT NULL,
    "fornecedor_item_id" UUID,
    "tipo" "MovimentacaoTipo" NOT NULL,
    "origem" "MovimentacaoOrigem" NOT NULL DEFAULT 'MANUAL',
    "quantidade" DECIMAL(14,3) NOT NULL,
    "preco_unitario" DECIMAL(12,4),
    "nota_fiscal_id" UUID,
    "observacao" VARCHAR(300),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimentacoes_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notas_fiscais_importadas" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "chave_acesso" VARCHAR(44) NOT NULL,
    "numero" VARCHAR(20),
    "serie" VARCHAR(10),
    "fornecedor_id" UUID,
    "data_emissao" TIMESTAMP(3),
    "valor_total" DECIMAL(12,2),
    "status" "NotaFiscalStatus" NOT NULL DEFAULT 'PROCESSADA',
    "xml_raw" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notas_fiscais_importadas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "partnerships_code_key" ON "partnerships"("code");

-- CreateIndex
CREATE INDEX "partnership_coupons_partnership_id_idx" ON "partnership_coupons"("partnership_id");

-- CreateIndex
CREATE UNIQUE INDEX "fornecedores_cnpj_key" ON "fornecedores"("cnpj");

-- CreateIndex
CREATE INDEX "insumo_itens_active_idx" ON "insumo_itens"("active");

-- CreateIndex
CREATE INDEX "insumo_fornecedor_itens_insumo_id_idx" ON "insumo_fornecedor_itens"("insumo_id");

-- CreateIndex
CREATE INDEX "insumo_fornecedor_itens_fornecedor_id_idx" ON "insumo_fornecedor_itens"("fornecedor_id");

-- CreateIndex
CREATE UNIQUE INDEX "insumo_fornecedor_item_codigo_unq" ON "insumo_fornecedor_itens"("fornecedor_id", "codigo_fornecedor");

-- CreateIndex
CREATE INDEX "movimentacoes_estoque_insumo_id_idx" ON "movimentacoes_estoque"("insumo_id");

-- CreateIndex
CREATE INDEX "movimentacoes_estoque_nota_fiscal_id_idx" ON "movimentacoes_estoque"("nota_fiscal_id");

-- CreateIndex
CREATE UNIQUE INDEX "notas_fiscais_importadas_chave_acesso_key" ON "notas_fiscais_importadas"("chave_acesso");

-- CreateIndex
CREATE INDEX "notas_fiscais_importadas_fornecedor_id_idx" ON "notas_fiscais_importadas"("fornecedor_id");

-- AddForeignKey
ALTER TABLE "partnership_coupons" ADD CONSTRAINT "partnership_coupons_partnership_id_fkey" FOREIGN KEY ("partnership_id") REFERENCES "partnerships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partnership_coupons" ADD CONSTRAINT "partnership_coupons_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partnership_coupons" ADD CONSTRAINT "partnership_coupons_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "menu_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insumo_fornecedor_itens" ADD CONSTRAINT "insumo_fornecedor_itens_insumo_id_fkey" FOREIGN KEY ("insumo_id") REFERENCES "insumo_itens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insumo_fornecedor_itens" ADD CONSTRAINT "insumo_fornecedor_itens_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_insumo_id_fkey" FOREIGN KEY ("insumo_id") REFERENCES "insumo_itens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_fornecedor_item_id_fkey" FOREIGN KEY ("fornecedor_item_id") REFERENCES "insumo_fornecedor_itens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_nota_fiscal_id_fkey" FOREIGN KEY ("nota_fiscal_id") REFERENCES "notas_fiscais_importadas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_fiscais_importadas" ADD CONSTRAINT "notas_fiscais_importadas_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

