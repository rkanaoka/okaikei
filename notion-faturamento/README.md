# Bodogami → Notion (faturamento SAIPOS + extrato bancário)

Serviço independente (Node/Express) que lê arquivos financeiros e sincroniza os dados com databases do Notion. Hoje cobre:

- **Faturamento por dia (SAIPOS, PDF)** → database de faturamento diário.
- **Extrato bancário mensal (Itaú em PDF, Santander em .xlsx)** → database de Lançamentos Financeiros (mesma database para os dois bancos, diferenciados pela propriedade "Conta Financeira").

Fica fora dos apps principais do okaikei (`backend/` e `frontend/`) de propósito: é um utilitário administrativo, não faz parte do fluxo do PDV. Roda como um processo Node/Express separado, na porta **3002**, sem tocar no backend NestJS (porta 3001) usado pelo caixa/garçom/painel.

As telas de acesso ficam dentro do app principal:
- `frontend/src/pages/notion-faturamento` (rota `/notion-faturamento`, link em Admin → Relatórios → "Importar Faturamento (Notion)")
- `frontend/src/pages/notion-extrato` (rota `/notion-extrato`, link em Admin → Relatórios → "Importar Extrato Bancário (Notion)") — aceita tanto o PDF do Itaú quanto a planilha .xlsx do Santander.

## 1. Criar a integração no Notion

1. Acesse [notion.so/my-integrations](https://www.notion.so/my-integrations) e clique em **New integration**.
2. Dê um nome (ex: "Financeiro Bodogami"), selecione o workspace e salve.
3. Copie o **Internal Integration Token** (começa com `secret_` ou `ntn_`) — vai virar `NOTION_TOKEN` (compartilhado pelas duas features).
4. Conecte a integração em **cada** database usada (passos 2 abaixo, incluindo as databases relacionadas de "Contas Financeiras" e "Competências de Exercício", se existirem): abra a database no Notion → `···` (menu) → **Connections** → adicione a integração.

## 2. Databases no Notion

### 2.1 Faturamento por dia (SAIPOS)

Database com uma propriedade de título (toda database já tem uma) e as colunas abaixo. Não é necessário criar manualmente — o serviço verifica e cria automaticamente as que faltarem na primeira sincronização:

| Propriedade | Tipo |
|---|---|
| Data | Date |
| Dia da Semana | Text |
| Vendas | Number |
| Valor de Vendas | Number (formato Real) |
| Valor Acumulado | Number (formato Real) |
| Ticket Médio | Number (formato Real) |
| Total dos Itens | Number (formato Real) |
| Taxa de Entrega | Number (formato Real) |
| Taxa de Serviço | Number (formato Real) |
| Acréscimos | Number (formato Real) |
| Descontos | Number (formato Real) |
| Vendas Canceladas | Number |
| Valor de Vendas Canceladas | Number (formato Real) |

O título de cada página recebe a data (ex: "01/02/2025"), e a propriedade **Data** guarda a mesma data no formato Notion — é ela que o serviço usa para saber se um dia já existe (e então atualiza em vez de duplicar).

Copie o **Database ID**: é o trecho de 32 caracteres na URL da database, entre a barra e o `?v=`:

```
https://www.notion.so/workspace/1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d?v=...
                                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Database ID
```

Isso vira `NOTION_DATABASE_ID`.

### 2.2 Extrato bancário (Lançamentos Financeiros)

Usa a database em `https://app.notion.com/p/bodogami/17c2b8aca9eb8085825dd841661d0ab0` — o ID `17c2b8aca9eb8085825dd841661d0ab0` vira `NOTION_EXTRATO_DATABASE_ID`.

Diferente da database de faturamento, aqui o serviço **não cria propriedades automaticamente** — só verifica se existem e falha com um erro claro listando o que falta, caso contrário. Propriedades obrigatórias:

| Propriedade | Tipo |
|---|---|
| Data | Date |
| Descrição | Text (pode ser a própria propriedade título da database) |
| Valor | Number — positivo para entrada/crédito, negativo para saída/débito |
| Conta Financeira | Select **ou** Relation para uma database separada de contas (o serviço detecta o tipo automaticamente) |
| Competência de Exercício | Select **ou** Relation para uma database separada de competências (idem) |
| Chave de Importação | Text (uso interno — evita duplicar lançamentos ao reenviar o mesmo extrato) |

Se "Conta Financeira" ou "Competência de Exercício" forem relations, o serviço busca a página relacionada cujo título (ou, no caso de Competência, a propriedade "Competência") bate com o valor — "Itaú"/"Santander" e o mês (ex: "2026-01") — e falha com um erro claro se a página ainda não existir na database relacionada (não cria automaticamente).

Cada lançamento vira uma página com `Conta Financeira` = "Itaú" (extrato PDF) ou "Santander" (planilha .xlsx), e `Competência de Exercício` = o mês do extrato (ex: "2026-01" para janeiro/2026) — ambos editáveis na tela antes de enviar.

### 2.3 Segurança contra sobrescrita — sync é somente-criação

O `Chave de Importação` de cada lançamento inclui o banco de origem (ex: `itau#2026-06-15#1`, `santander#2026-06-15#1`), justamente para que um lançamento do Itaú e um do Santander no mesmo dia nunca gerem a mesma chave.

Além disso, `/api/extrato/sync` **nunca edita nem remove** uma página já existente no Notion. Se a "Chave de Importação" de um lançamento já existir na database, a linha é apenas ignorada (status "ignorado" na tela) — não é criada uma página nova nem a existente é sobrescrita. Isso existe porque uma versão anterior fazia upsert (criava OU atualizava por chave) e, como a chave antiga não incluía o banco de origem, sincronizar um extrato Santander depois de um Itaú do mesmo mês podia sobrescrever silenciosamente lançamentos do Itaú com dados do Santander nos dias em que as sequências coincidiam. Se algum lançamento precisar ser corrigido depois de já sincronizado, a correção deve ser feita manualmente direto no Notion.

**Se você foi afetado pelo bug antigo** (lançamentos do Itaú com conteúdo do Santander, ou vice-versa, num mesmo mês): reenvie os extratos do mês afetado — com a chave corrigida, o reenvio cria os lançamentos corretos para os dois bancos sem duplicar nada que já esteja com a chave nova (`itau#...`/`santander#...`). Depois, revise manualmente na database do Notion se sobraram páginas antigas com `Chave de Importação` no formato antigo (sem prefixo de banco, ex: `2026-06-15#1`) — essas são resíduos do bug e podem estar com o banco/valor errado; confira o conteúdo e apague as que forem duplicatas incorretas.

## 3. Configurar e rodar o serviço

```bash
cd notion-faturamento/backend
cp .env.example .env
```

Edite `.env` e preencha:

```
NOTION_TOKEN=secret_xxx...
NOTION_DATABASE_ID=xxx...
NOTION_EXTRATO_DATABASE_ID=17c2b8aca9eb8085825dd841661d0ab0
PORT=3002
```

Instale as dependências e rode:

```bash
npm install
npm start      # sobe em background (PID em .server.pid, logs em .server.log)
npm stop       # para o processo em background
npm restart    # para e sobe de novo — use depois de alterar o .env ou o código
npm run dev    # roda em primeiro plano com --watch, útil durante o desenvolvimento
```

Sobe em `http://localhost:3002`. `GET /api/health` mostra `notionConfigured` (faturamento) e `extratoNotionConfigured` (extrato) separadamente.

Se você mudar a porta, atualize também `VITE_NOTION_FATURAMENTO_API_URL` no `.env` do `frontend/` (usado pelas duas páginas, veja `frontend/src/pages/notion-faturamento/api.ts` e `frontend/src/pages/notion-extrato/api.ts`).

## 4. Usar

**Faturamento SAIPOS:**
1. No app principal, acesse **Admin → Relatórios → Importar Faturamento (Notion)** (ou vá direto para `/notion-faturamento`).
2. Arraste o PDF mensal "Faturamento por dia" do SAIPOS, revise a tabela e clique em **Enviar para o Notion**.

**Extrato bancário (Itaú ou Santander):**
1. Acesse **Admin → Relatórios → Importar Extrato Bancário (Notion)** (ou vá direto para `/notion-extrato`).
2. Arraste o PDF do extrato mensal do Itaú **ou** a planilha `.xlsx` do extrato Santander — a tela detecta o formato pela extensão do arquivo e usa o parser correto.
3. Confira/ajuste "Conta Financeira" (pré-preenchido "Itaú" ou "Santander" conforme o arquivo) e "Competência de Exercício" (pré-preenchido a partir do período do extrato).
4. Clique em **Enviar para o Notion**.

Em todos os casos, cada linha vira uma página na database — se já existir (mesma data, ou mesmo lançamento no extrato/faturamento), é atualizada em vez de duplicada.

## Como funciona a extração dos arquivos

**Faturamento SAIPOS (PDF)**: `pdf-parse` extrai o texto e reconhece cada linha por um padrão de colunas fixo (Data, Dia da Semana, Vendas, 8 valores em R$, Vendas Canceladas, Valor de Vendas Canceladas). A linha "Total" e o cabeçalho são ignorados. Validado contra um PDF real de fevereiro/2025 (28 linhas, totais batendo com a linha "Total" do relatório).

**Extrato Itaú (PDF)**: o serviço localiza a seção "Conta Corrente | Movimentação" (que no PDF pode se estender por várias páginas) e interpreta cada linha como `data (opcional) + descrição + valor`, tratando referências numéricas coladas na descrição (código da maquininha Rede, sufixos "-NNNNNN", referências "DD/MM" em PIX) para não confundi-las com o valor do lançamento. As linhas "Saldo anterior" e "SALDO APLIC AUT MAIS" são descartadas, conforme solicitado. Validado contra o extrato real de janeiro/2026: 611 lançamentos extraídos, com soma de entradas e saídas batendo exatamente com os totais impressos no próprio PDF (incluindo o totalizador de aplicações automáticas).

**Extrato Santander (.xlsx)**: o serviço reconhece dois layouts diferentes de planilha e detecta automaticamente qual foi enviado, pelo cabeçalho:

- **Simples** — colunas "Data | Descrição | Crédito (R$) | Débito (R$)", com o período em uma célula do tipo "Extrato de 01/01/2026 a 31/01/2026" e datas por extenso em português (ex: "Sexta, 30 de janeiro de 2026"). A linha "TOTAL" no rodapé é descartada. Validado contra uma planilha real de janeiro/2026: 154 lançamentos extraídos, com soma de créditos e débitos batendo exatamente com a linha "TOTAL" da própria planilha.
- **Detalhado** — colunas "Data | Histórico | Documento | Valor (R$) | Saldo (R$)", datas no formato "DD/MM/AAAA". A "Descrição" é a concatenação de Histórico + Documento, e o "Valor" já vem em uma única coluna assinada (positivo = crédito, negativo = débito). Não há célula de período — a competência é inferida como o mês/ano mais frequente entre os lançamentos da planilha. Validado contra uma planilha real de junho/2026: 145 lançamentos extraídos, reconciliados linha a linha contra a coluna "Saldo" (saldo[i] = saldo[i+1] + valor[i], sem divergências) e testado de ponta a ponta via API (competência inferida corretamente como "2026-06").

Em ambos os casos, a tela `/notion-extrato` e o endpoint `/api/extrato/parse-xlsx` funcionam sem nenhuma configuração extra — o formato é detectado automaticamente a partir do cabeçalho da planilha.

Se o layout de algum arquivo mudar, os parsers ficam em `backend/src/pdfParser.js` (SAIPOS), `backend/src/extratoParser.js` (Itaú PDF) e `backend/src/extratoXlsxParser.js` (Santander .xlsx).

## Endpoints da API

**Faturamento SAIPOS:**
- `GET /api/health` — status do serviço (Notion configurado ou não, para as duas features).
- `POST /api/parse` (multipart, campo `file`) — recebe o PDF e devolve `{ loja, fileName, rows }`.
- `POST /api/sync` (JSON, `{ rows }`) — sincroniza com o Notion, retornando o resultado por linha (`criado`, `atualizado` ou `erro`).

**Extrato bancário:**
- `POST /api/extrato/parse` (multipart, campo `file`) — recebe o PDF do Itaú e devolve `{ fileName, periodo, competenciaDefault, contaFinanceiraDefault: "Itaú", transactions }`.
- `POST /api/extrato/parse-xlsx` (multipart, campo `file`) — recebe a planilha do Santander e devolve o mesmo formato, com `contaFinanceiraDefault: "Santander"`.
- `POST /api/extrato/sync` (JSON, `{ rows, contaFinanceira, competencia }`) — sincroniza com o Notion (mesma database, independente da origem), retornando o resultado por lançamento.

## Observações

- Não está incluso no `docker-compose.yml` do projeto — hoje roda como processo Node separado. Se quiser containerizar junto com os outros serviços, dá pra copiar o padrão dos `Dockerfile` de `backend/` e `frontend/` e adicionar um serviço novo no compose.
- CORS está liberado (`origin: '*'`) porque é um serviço interno de uso administrativo. Se for exposto fora da rede local, restrinja a origin.
- O envio real para o Notion não foi testado a partir deste ambiente de desenvolvimento (sem acesso de rede a `api.notion.com` aqui) — o parsing de todos os arquivos foi validado de ponta a ponta via HTTP contra o serviço rodando localmente, com as credenciais reais configuradas. Vale conferir o primeiro envio real de cada fonte (Itaú, Santander) pela tela antes de confiar no upsert.
