# CLAUDE.md — modules/fiscal/

## Responsabilidade
Emissão de **NFC-e (modelo 65)** pela API **Focus NFe v2**. Módulo **opcional e independente**:
o PDV (comandas/pagamentos) não importa nada daqui. A integração é por evento (`comanda.closed` no NATS)
e por leitura das tabelas do PDV. Toda a regra de `fiscal_enabled` vive **somente** neste módulo.

## Estrutura
```
domain/
  entities/fiscal-settings.ts            # FiscalSettings, defaults, tabela tPag, status do documento
  value-objects/fiscal-item-fields.ts    # validação/normalização dos campos fiscais do item + pendências (puro)
  value-objects/fiscal-template.ts       # modelo fiscal: normalizar, validar e resolver (modelo + CFOP -> campos do item) (puro)
  repositories/fiscal-repository.port.ts # Port único: config, leitura do PDV, itens, documentos, auditoria
application/
  contracts/focus-nfe.port.ts            # Port da API Focus (emitir/consultar/cancelar/inutilizar/e-mail)
  mappers/nfce.mapper.ts                 # comanda do PDV → JSON da Focus (função pura, não inventa dados)
  use-cases/
    fiscal-settings.service.ts           # fiscal_enabled + configurações + token (lido do .env)
    fiscal-items.service.ts              # classificação fiscal dos itens do cardápio + relatório de pendências
    fiscal-templates.service.ts          # modelos fiscais por grupo de produtos + aplicação/propagação aos itens
    nfce.service.ts                      # ciclo de vida: emitir, consultar, cancelar, inutilizar, e-mail, reconciliar
    fiscal-print.service.ts              # DANFE-NFC-e em ESC/POS (via PrintingService.printBuffer)
    fiscal-audit.service.ts              # trilha de auditoria (nunca lança)
infrastructure/
  api-clients/focus-nfe.client.ts        # axios, Basic Auth (token como usuário, senha vazia), timeout, classificação de erros
  repositories/prisma-fiscal.repository.ts
  listeners/comanda-closed.listener.ts   # NATS `comanda.closed` → emissão automática (fire-and-forget)
  jobs/fiscal.jobs.ts                    # a cada 2 min: reconcilia notas incertas + recupera comandas sem documento
fiscal.module.ts
```
Controller: `@/runtimes/api/controllers/fiscal.controller.ts` (`/fiscal/*`).

## Regras de ouro
- **Desligado = invisível.** `fiscal_enabled=false` → nenhuma chamada à Focus, nenhuma emissão; PDV inalterado.
  Desligar **não apaga** configurações, documentos nem histórico; religar recupera tudo.
- **Token só no `.env`** (`FOCUS_NFE_TOKEN_HOMOLOGACAO` / `FOCUS_NFE_TOKEN_PRODUCAO`). Nunca em banco, log ou frontend.
  O Admin só vê "configurado: sim/não".
- **Nada de tributação inventada.** Campos fiscais ficam vazios até o contador definir; item com pendência não emite
  (`PENDENCIA_FISCAL`). Dados validados pelo contador responsável.
- **O JSON manda, não o HTTP.** A Focus pode responder 2xx com `status: erro_autorizacao`.
- **Timeout/rede = resultado desconhecido.** Documento vai a `ERRO_COMUNICACAO`; antes de reenviar sempre `GET /nfce/{ref}`
  (nunca duplica nota). `ref` = `<comandaId sem hífens><h|p><tentativa>` (único por token/ambiente; ref autorizada não se reusa).
- **Cancelamento** só até 30 min após a autorização (regra da SEFAZ/Focus). Após cancelar, reemitir cria nova tentativa/ref.

## Fluxo de emissão
`comanda.closed` (NATS) → `emitAutomatic` (se enabled && autoEmit) → `emit` → mapper → `POST /nfce?ref=` →
`applyResponse` → (autorizada) consulta completa p/ protocolo + impressão do DANFE-NFC-e.
Rede de segurança: `FiscalJobs.catchUp` emite comandas fechadas **após a ativação do módulo** (máx. 6 h) que ficaram sem documento.
Manual: Caixa (`FiscalNfcePanel`) e Admin › Fiscal › Notas emitidas.

## Valores derivados pelo mapper
Quando faltam no cadastro, o `NfceMapper` calcula a partir do item: base/valor de ICMS (CST 00/10/20/70), crédito do Simples (CSOSN 101/201),
BC/ICMS-ST com modalidade 4 (MVA), crédito presumido (base × percentual) e base/valor de PIS/COFINS (CST 01/02). **Validar com o contador.**

## Rateio de descontos / taxa de serviço
O total da nota = soma dos pagamentos. A diferença para o subtotal dos itens é rateada proporcionalmente:
negativa → `valor_desconto`, positiva (taxa de serviço) → `valor_outras_despesas`. **Confirmar o tratamento da taxa de serviço com o contador.**

## Dados (Prisma)
- `MenuItem.fiscal*` — NCM, CEST, CFOP, unidade, origem, CST/CSOSN ICMS, CST PIS/COFINS, benefício, IBS/CBS CST+cClassTrib.
  `fiscalExtra` (Json) guarda os demais campos da Focus pelo **nome exato** (`icms_aliquota`, `pis_aliquota_porcentual`…)
  → a Reforma Tributária evolui sem nova migration.
- `FiscalTemplate` (`fiscal_templates`) — modelo fiscal por grupo de produtos (alcoólicos, comida...). `data` (JSON) guarda
  NCM, CEST, origem, escala, crédito presumido, ICMS/ICMS ST/PIS/COFINS/IBS-CBS e uma lista de CFOPs (cada um com seu
  CSOSN/CST e CST PIS/COFINS). `MenuItem.fiscalTemplateId/fiscalTemplateCfop` vinculam o item: as colunas `fiscal_*` do item
  são **materializadas** a partir do modelo (a emissão continua lendo só as colunas) e reaplicadas a todos os itens vinculados
  quando o modelo é editado. Só entram na resolução os campos compatíveis com o CSOSN/CST do CFOP (ex.: sem alíquota de ICMS
  em CSOSN 102/500). Editar o item manualmente desfaz o vínculo. Modelo em uso não pode ser excluído (só desativado).
- `FiscalDocument`, `FiscalAuditLog` (sem FK para comandas — o histórico fiscal é independente do PDV).
- Configuração em `system_config`: chaves `fiscal_enabled` e `fiscal_settings`.

## Permissões
`fiscal` (grupo de permissões do Admin; ADMIN sempre passa): configuração, modelos fiscais, classificação de itens, notas emitidas,
cancelamento, inutilização, auditoria. Rotas do Caixa (status, preview, emitir, consultar, imprimir, e-mail de uma comanda)
seguem o modelo do restante do Caixa (LAN, sem login).

## Referências Focus NFe
- Emitir `POST /nfce?ref=` · Consultar `GET /nfce/{ref}?completa=1` · Cancelar `DELETE /nfce/{ref}` (`justificativa` 15–255)
- Inutilizar `POST /nfce/inutilizacao` (`cnpj, serie, numero_inicial, numero_final, justificativa`) · E-mail `POST /nfce/{ref}/email`
- Campos do item: https://campos.focusnfe.com.br/nfe/ItemNotaFiscalXML.html (a página específica de NFC-e retorna 403 para
  acesso automatizado; os nomes de item da NFC-e coincidem com os da NF-e — **validar em homologação**).
