-- AlterTable
ALTER TABLE "fornecedores" ADD COLUMN     "bairro" VARCHAR(100),
ADD COLUMN     "cep" VARCHAR(10),
ADD COLUMN     "complemento" VARCHAR(100),
ADD COLUMN     "inscricao_estadual" VARCHAR(20),
ADD COLUMN     "logradouro" VARCHAR(150),
ADD COLUMN     "municipio" VARCHAR(100),
ADD COLUMN     "nome_fantasia" VARCHAR(150),
ADD COLUMN     "numero" VARCHAR(20),
ADD COLUMN     "representante_email" VARCHAR(200),
ADD COLUMN     "representante_nome" VARCHAR(150),
ADD COLUMN     "representante_telefone" VARCHAR(20),
ADD COLUMN     "uf" VARCHAR(2);

-- AlterTable
ALTER TABLE "insumo_itens" ADD COLUMN     "categoria_id" UUID,
ADD COLUMN     "subcategoria_id" UUID;

-- CreateTable
CREATE TABLE "insumo_categorias" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "nome" VARCHAR(80) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insumo_categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insumo_subcategorias" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "categoria_id" UUID NOT NULL,
    "nome" VARCHAR(80) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insumo_subcategorias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "insumo_categorias_nome_key" ON "insumo_categorias"("nome");

-- CreateIndex
CREATE INDEX "insumo_subcategorias_categoria_id_idx" ON "insumo_subcategorias"("categoria_id");

-- CreateIndex
CREATE UNIQUE INDEX "insumo_subcategorias_categoria_id_nome_key" ON "insumo_subcategorias"("categoria_id", "nome");

-- CreateIndex
CREATE INDEX "insumo_itens_categoria_id_idx" ON "insumo_itens"("categoria_id");

-- CreateIndex
CREATE INDEX "insumo_itens_subcategoria_id_idx" ON "insumo_itens"("subcategoria_id");

-- AddForeignKey
ALTER TABLE "insumo_subcategorias" ADD CONSTRAINT "insumo_subcategorias_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "insumo_categorias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insumo_itens" ADD CONSTRAINT "insumo_itens_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "insumo_categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insumo_itens" ADD CONSTRAINT "insumo_itens_subcategoria_id_fkey" FOREIGN KEY ("subcategoria_id") REFERENCES "insumo_subcategorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

