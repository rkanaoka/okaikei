-- Modelos fiscais por grupo de produtos (Fiscal › Dados fiscais) e vínculo opcional do item do cardápio.
-- Somente aditiva — não altera dados existentes.

-- AlterTable
ALTER TABLE "menu_items" ADD COLUMN     "fiscal_template_cfop" VARCHAR(4),
ADD COLUMN     "fiscal_template_id" UUID;

-- CreateTable
CREATE TABLE "fiscal_templates" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(300),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fiscal_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "menu_items_fiscal_template_id_idx" ON "menu_items"("fiscal_template_id");

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_fiscal_template_id_fkey" FOREIGN KEY ("fiscal_template_id") REFERENCES "fiscal_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

