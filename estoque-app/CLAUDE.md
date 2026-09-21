# CLAUDE.md — estoque-app

## Responsabilidade
App Next.js (Pages Router) para gestão de estoque via mobile/tablet, servido na VPS em
`https://estoque.bodogami.tech`. Sem banco de dados próprio — todo dado (insumos, saldo,
movimentações) vive no backend do okaikei, acessado via WireGuard. Autenticação por senha
única (`ESTOQUE_PASSWORD`), sem cadastro de usuários.

## Variáveis de ambiente

| Variável                  | Descrição                                                        |
|----------------------------|-------------------------------------------------------------------|
| `ESTOQUE_PASSWORD`        | Senha da tela de login                                            |
| `ESTOQUE_SESSION_SECRET`  | Segredo HMAC usado para assinar o cookie de sessão                |
| `OKAIKEI_BACKEND_URL`     | IP WireGuard do backend local (mesmo valor de `LOCAL_BACKEND_URL`)|
| `OKAIKEI_API_KEY`         | Chave compartilhada (mesmo valor de `LOCAL_API_KEY`)               |

## Autenticação
Sem tabela de sessão — o cookie `estoque_session` carrega um payload `{ exp }` assinado
com HMAC-SHA256 (`lib/auth.ts`, Web Crypto API, funciona tanto no runtime Node das API
routes quanto no runtime Edge do middleware). `middleware.ts` protege todas as rotas
(páginas e `/api/*`) exceto `/login` e `/api/auth/login`, redirecionando para o login (ou
devolvendo 401 em API) quando o cookie é inválido/expirado. TTL de 12h.

## Proxy para o okaikei
O browser nunca fala com o backend do okaikei diretamente. Toda chamada passa por
`pages/api/v1/estoque/[...slug].ts`, que encaminha para
`{OKAIKEI_BACKEND_URL}/estoque-mobile/{slug}` injetando `x-api-key: OKAIKEI_API_KEY` —
ver `backend/src/runtimes/api/controllers/estoque-mobile.controller.ts` do lado do
okaikei. `lib/apiClient.ts` é o cliente usado pelas páginas para chamar esse proxy.

## Leitor de código de barras Bluetooth
`lib/barcodeScanner.ts` (`useBarcodeScanner`) escuta `keydown` a nível de `window` e
diferencia leitor de digitação humana pelo intervalo entre teclas (≤50ms = leitura de
scanner HID). Não exige foco em nenhum campo. Usado em `pages/contagem.tsx` (busca
insumo pelo código) e `pages/retirada.tsx` no Modo Ágil (cada leitura soma +1).

## Estrutura de arquivos
```
estoque-app/
  middleware.ts              # Proteção de rotas (Edge runtime)
  lib/
    auth.ts                  # Cookie de sessão assinado (HMAC)
    apiClient.ts              # Cliente do proxy /api/v1/estoque/*
    barcodeScanner.ts          # Hook de detecção de leitor BT (keyboard wedge)
    format.ts                  # Formatação de quantidade/unidade/data
  components/
    Layout.tsx                # Topbar + bottom nav (Início/Contagem/Retirada)
    Button.tsx, SearchField.tsx, BottomSheet.tsx, ToastProvider.tsx
  pages/
    login.tsx
    index.tsx                 # Dashboard: alertas de mínimo + movimentações recentes
    contagem.tsx               # Conferência de estoque (busca ou leitor BT)
    retirada.tsx                # Retirada — modo Manual ou Ágil (leitor BT contínuo)
    api/
      auth/login.ts, logout.ts
      v1/estoque/[...slug].ts   # Proxy autenticado → okaikei (x-api-key)
  styles/globals.css           # Tokens de marca (cores, fontes, radius) + reset
  Dockerfile                    # Multi-stage, next build --output standalone
```

## Marca Bodogami
Paleta em `styles/globals.css` (`--color-navy #0d1b2a`, `--color-yellow #ffd60a`,
`--color-orange #ff6b2b`, `--color-red #e63946`, `--color-green #2dc653`), mesmos tons
usados no `cardapio-app`. Fonte de destaque `Kenyan Coffee` referenciada via
`@font-face` apontando para `public/fonts/kenyan-coffee.woff2` — arquivo licenciado
ainda não está no repo; até lá cai no fallback (`Baloo 2`/sans-serif arredondada).
Botões primários usam `--gradient-warm` (laranja→vermelho), pill (`border-radius: 999px`),
área de toque mínima de 48px (`--tap-min`). Sem modais — só `BottomSheet`.

## Como rodar localmente
```bash
cd estoque-app
npm install
cp .env.example .env.local   # preencha os valores
npm run dev
```

## Deploy (VPS — Hostinger, Traefik em network_mode: host)
Serviço `estoque-app` em `docker-compose.hostinger.yml`, domínio `ESTOQUE_DOMAIN`
(default `estoque.bodogami.tech`), reutiliza `LOCAL_BACKEND_URL`/`LOCAL_API_KEY` do
`.env.vps` (mesmo túnel WireGuard do `vps-api`). Ver `.env.vps.example` na raiz.

## Não pertence aqui
- CRUD completo de insumos/fornecedores/NF-e → isso é do Admin do `frontend/`, não do
  estoque-app (que só busca, conta e dá saída)
- Qualquer chamada direta ao banco do okaikei — sempre via `estoque-mobile` (x-api-key)
