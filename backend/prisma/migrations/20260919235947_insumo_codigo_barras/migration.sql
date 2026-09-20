-- AlterTable
ALTER TABLE "insumo_itens" ADD COLUMN     "codigo_barras" VARCHAR(8);

-- CreateIndex
CREATE UNIQUE INDEX "insumo_itens_codigo_barras_key" ON "insumo_itens"("codigo_barras");

-- CreateIndex
CREATE INDEX "insumo_itens_codigo_barras_idx" ON "insumo_itens"("codigo_barras");

