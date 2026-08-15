#!/usr/bin/env bash
# Recusa subir produção se .env não existir ou ainda tiver os valores padrão de
# desenvolvimento (copiados de .env.example). Isso já aconteceu neste projeto —
# ver aviso de segurança na revisão que criou o Makefile.prod.
set -u

test -f .env || { echo "✗ .env não encontrado. Copie .env.example para .env e preencha os valores reais de produção."; exit 1; }

fail=0
check() { grep -qE "$1" .env && { echo "✗ $2"; fail=1; }; }

check "^POSTGRES_PASSWORD=bodogami_secret$" "POSTGRES_PASSWORD ainda é o valor padrão de dev — troque em .env."
check "^REDIS_PASSWORD=redis_secret$"       "REDIS_PASSWORD ainda é o valor padrão de dev — troque em .env."
check "^NATS_TOKEN=nats_secret$"            "NATS_TOKEN ainda é o valor padrão de dev — troque em .env."
check "^JWT_SECRET=TROQUE_ISSO_EM_PRODUCAO" "JWT_SECRET ainda é o placeholder — rode make -f Makefile.prod secret e cole em .env."
check "^LOCAL_API_KEY=troque_por_chave"     "LOCAL_API_KEY ainda é o placeholder — rode make -f Makefile.prod secret e cole em .env."

for v in POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB REDIS_PASSWORD NATS_TOKEN JWT_SECRET LOCAL_API_KEY; do
  val=$(grep -E "^$v=" .env | cut -d= -f2-)
  if [ -z "$val" ]; then echo "✗ $v está vazio em .env."; fail=1; fi
done

if [ "$fail" != "0" ]; then echo ""; echo "Corrija .env antes de subir produção."; exit 1; fi
echo "✓ .env validado — sem segredos padrão de desenvolvimento."
