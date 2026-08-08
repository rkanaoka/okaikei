# CLAUDE.md — infrastructure/api-clients/

## O que é
Adapters para comunicação com sistemas externos via protocolo específico (TCP, HTTP, etc.).
Implementam os Ports definidos em `application/contracts/`.

## Regras
- Responsável por: autenticação, retry, timeout, serialização, tratamento de erros de protocolo
- Proibido: persistir dados, conter regras de negócio, publicar eventos

## Nomenclatura
- `Tcp[Protocol]Client` — conexão TCP
- `Axios[Service]Client` — chamadas HTTP
