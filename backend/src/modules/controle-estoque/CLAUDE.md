# CLAUDE.md — modules/controle-estoque/

## Responsabilidade
Bounded Context de Controle de Estoque. Expõe:
1. Impressão de etiquetas de validade via impressora térmica ZPL (Elgin L42 Pro Full).
2. Cadastro de insumos (itens de estoque), suas marcas/fornecedores e entrada de
   estoque — manual ou por importação de NF-e (XML) — com conversão automática de
   unidades de medida.

## Estrutura
```
domain/
  value-objects/unidade-conversao.ts   # Regras de conversão de unidades (puro, sem deps externas)
  repositories/
    label-printer.port.ts              # Port: impressora de etiquetas
    etiqueta-layout-repository.port.ts # Port: layout de impressão salvo
    insumo-repository.port.ts          # Port: InsumoItem + InsumoFornecedorItem + movimentações
    insumo-categoria-repository.port.ts # Port: InsumoCategoria + InsumoSubcategoria
    fornecedor-repository.port.ts      # Port: Fornecedor
    nota-fiscal-repository.port.ts     # Port: NotaFiscalImportada
application/
  contracts/nfe-xml-parser.port.ts     # Port: leitura do XML da NF-e
  use-cases/
    gerar-etiquetas-validade.service.ts
    insumos.service.ts                 # CRUD de insumos, marcas/fornecedores, entrada manual
    insumo-categorias.service.ts       # CRUD de categorias/subcategorias de insumo
    fornecedores.service.ts            # CRUD de fornecedores + extração de dados via XML de NF-e
    importar-nfe.service.ts            # Preview + confirmação da importação de NF-e
infrastructure/
  printers/zpl-label-printer.adapter.ts
  parsers/fast-xml-nfe-parser.adapter.ts   # Adapter: fast-xml-parser
  repositories/
    prisma-etiqueta-layout.repository.ts
    prisma-insumo.repository.ts
    prisma-insumo-categoria.repository.ts
    prisma-fornecedor.repository.ts
    prisma-nota-fiscal.repository.ts
controle-estoque.module.ts
```

## Modelo de dados (Prisma)
- `InsumoItem` — item canônico de estoque (ex: "Arroz"). Saldo (`estoqueAtual`) sempre
  expresso na `unidadeBase` (MG, ML ou UN) — nunca na unidade de compra de um fornecedor.
  `categoriaId`/`subcategoriaId` (opcionais) apontam para `InsumoCategoria`/`InsumoSubcategoria`;
  a coluna `categoria` (texto livre) é legado, mantida só por compatibilidade.
- `InsumoCategoria` / `InsumoSubcategoria` — taxonomia de 2 níveis para organizar insumos
  (ex: categoria "Bebidas" → subcategoria "Refrigerantes"). Sem exclusão definitiva, só
  `active` (mesmo padrão de `MenuCategory`/Insumo — desativar em vez de apagar).
- `InsumoFornecedorItem` — uma "SKU" de compra: marca + fornecedor + unidade de compra +
  fator de conversão para a unidadeBase. Um mesmo `InsumoItem` pode ter várias linhas
  (marcas/embalagens diferentes).
- `Fornecedor` — nome, nome fantasia, CNPJ, IE, endereço completo, telefone/email da
  empresa e dados do representante comercial (`representanteNome/Telefone/Email`). Criado
  automaticamente (com todos os campos disponíveis no XML) na importação de NF-e quando o
  CNPJ do emitente ainda não existe.
- `MovimentacaoEstoque` — kardex: toda entrada/saída/ajuste de estoque, com origem
  (MANUAL | NFE) e, quando aplicável, a nota fiscal de origem.
- `NotaFiscalImportada` — uma linha por NF-e importada (chave de acesso única — impede
  reimportação da mesma nota).

## Conversão de unidades
Ver `domain/value-objects/unidade-conversao.ts`. MG/G/KG e ML/L e UN/DUZIA têm fator de
conversão fixo; CAIXA/PACOTE/FARDO/OUTRO exigem que o fator seja informado por fornecedor
(ex: "caixa com 24 unidades"). `GET /estoque/insumos/unidades-medida` expõe essa tabela
para o frontend.

## Importação de NF-e
A entrada por "chave de acesso" é feita via **upload do XML da nota** (não há consulta
online à SEFAZ nesta versão — isso exigiria certificado digital ou um provedor pago tipo
Focus NFe/PlugNotas/NFe.io). Fluxo em duas etapas:
1. `POST /estoque/insumos/nfe/preview` — recebe `{ xml }`, devolve os itens da nota e
   indica quais já têm uma `InsumoFornecedorItem` reconhecida (match por fornecedor + `cProd`).
2. `POST /estoque/insumos/nfe/confirmar` — recebe `{ xml, itens }` com o mapeamento de
   cada item (insumo existente, novo insumo a criar, ou SKU já reconhecida) e grava
   fornecedor, insumos, SKUs, `MovimentacaoEstoque` (ENTRADA/NFE) e a `NotaFiscalImportada`.

## Impressora de etiquetas
- **Modelo**: Elgin L42 Pro Full · **Linguagem**: ZPL II
- **Etiqueta**: BOPP branco 60×30 mm (480×240 dots a 203 DPI)
- **Conexões suportadas**: USB (device file) ou Ethernet (TCP porta 9100)

## Variáveis de ambiente (etiquetas)
| Variável                   | Padrão          | Descrição                    |
|----------------------------|-----------------|-------------------------------|
| LABEL_PRINTER_TYPE         | ethernet        | `usb` ou `ethernet`          |
| LABEL_PRINTER_HOST         | 192.168.1.100   | IP da impressora (ethernet)  |
| LABEL_PRINTER_PORT         | 9100            | Porta TCP (ethernet)         |
| LABEL_PRINTER_USB_PATH     | /dev/usb/lp0    | Device file (USB)            |
| LABEL_PRINTER_TIMEOUT_MS   | 5000            | Timeout de conexão TCP       |

## Endpoints
- `POST /estoque/etiquetas/print` / `GET /estoque/etiquetas/status`
- `GET/POST/PUT/DELETE /estoque/insumos` — CRUD de insumos
- `GET /estoque/insumos/unidades-medida` — tabela de unidades/fatores fixos
- `POST /estoque/insumos/:id/fornecedores`, `PUT|DELETE /estoque/insumos/fornecedores/:id` — SKUs
- `POST /estoque/insumos/:id/entrada` — entrada manual de estoque
- `GET/POST /estoque/categorias`, `PUT /estoque/categorias/:id` — CRUD de categorias
- `POST /estoque/categorias/:categoriaId/subcategorias`, `PUT /estoque/categorias/subcategorias/:id` — CRUD de subcategorias
- `GET/POST/PUT/DELETE /estoque/fornecedores` — CRUD de fornecedores (`DELETE` = inativar)
- `POST /estoque/fornecedores/nfe-emitente` — lê `{ xml }` e devolve os dados do emitente
  (nome, nome fantasia, CNPJ, IE, endereço, telefone) para pré-preencher o cadastro, sem gravar nada
- `POST /estoque/insumos/nfe/preview` / `POST /estoque/insumos/nfe/confirmar` — importação de NF-e
