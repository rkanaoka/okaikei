-- Módulo fiscal (NFC-e via Focus NFe): classificação fiscal dos itens do cardápio,
-- documentos emitidos e log de auditoria. Somente aditiva — não altera dados existentes.

-- AlterTable
ALTER TABLE "menu_items" ADD COLUMN     "fiscal_cest" VARCHAR(7),
ADD COLUMN     "fiscal_cfop" VARCHAR(4),
ADD COLUMN     "fiscal_codigo_beneficio" VARCHAR(10),
ADD COLUMN     "fiscal_cofins_situacao" VARCHAR(2),
ADD COLUMN     "fiscal_extra" JSONB,
ADD COLUMN     "fiscal_ibs_cbs_classificacao" VARCHAR(6),
ADD COLUMN     "fiscal_ibs_cbs_situacao" VARCHAR(3),
ADD COLUMN     "fiscal_icms_origem" VARCHAR(1),
ADD COLUMN     "fiscal_icms_situacao" VARCHAR(3),
ADD COLUMN     "fiscal_ncm" VARCHAR(8),
ADD COLUMN     "fiscal_pis_situacao" VARCHAR(2),
ADD COLUMN     "fiscal_unidade_comercial" VARCHAR(6) NOT NULL DEFAULT 'UN';

-- CreateTable
CREATE TABLE "fiscal_documents" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "comanda_id" UUID NOT NULL,
    "ref" VARCHAR(60) NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "ambiente" VARCHAR(15) NOT NULL,
    "status" VARCHAR(25) NOT NULL,
    "trigger" VARCHAR(10) NOT NULL,
    "focus_status" VARCHAR(40),
    "status_sefaz" VARCHAR(10),
    "mensagem_sefaz" TEXT,
    "chave_nfe" VARCHAR(44),
    "numero" VARCHAR(15),
    "serie" VARCHAR(5),
    "protocolo" VARCHAR(30),
    "qrcode_url" TEXT,
    "url_consulta_nf" TEXT,
    "caminho_xml" TEXT,
    "caminho_danfe" TEXT,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "request_payload" JSONB,
    "response_payload" JSONB,
    "error_message" TEXT,
    "printed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fiscal_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fiscal_audit_logs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
    "document_id" UUID,
    "comanda_id" UUID,
    "action" VARCHAR(40) NOT NULL,
    "actor" VARCHAR(80) NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "http_status" INTEGER,
    "detail" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fiscal_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_documents_ref_key" ON "fiscal_documents"("ref");

-- CreateIndex
CREATE INDEX "fiscal_documents_comanda_id_idx" ON "fiscal_documents"("comanda_id");

-- CreateIndex
CREATE INDEX "fiscal_documents_status_idx" ON "fiscal_documents"("status");

-- CreateIndex
CREATE INDEX "fiscal_documents_created_at_idx" ON "fiscal_documents"("created_at");

-- CreateIndex
CREATE INDEX "fiscal_audit_logs_document_id_idx" ON "fiscal_audit_logs"("document_id");

-- CreateIndex
CREATE INDEX "fiscal_audit_logs_comanda_id_idx" ON "fiscal_audit_logs"("comanda_id");

-- CreateIndex
CREATE INDEX "fiscal_audit_logs_created_at_idx" ON "fiscal_audit_logs"("created_at");

