#!/bin/sh
# ─────────────────────────────────────────────────────────────────────────────
# Bodogami — pg_dump backup script
# Runs inside o serviço Docker 'backup' (imagem postgres:16-alpine — sem bash,
# por isso #!/bin/sh puro e sem "pipefail"/"[[ ]]").
# ─────────────────────────────────────────────────────────────────────────────
set -eu

# ── Config ────────────────────────────────────────────────────────────────────
# Usa DATABASE_URL (URI completa) em vez de montar host/user/senha na mão: a
# senha em POSTGRES_PASSWORD vem URL-encoded (ex: "%40" pra "@"), e PGPASSWORD
# não decodifica isso — só uma URI de conexão de verdade é decodificada certo
# pelo libpq. DB_NAME só é usado pro nome do arquivo, não pra conectar.
DB_URI="${DATABASE_URL:?DATABASE_URL precisa estar definida em .env}"
DB_NAME="${POSTGRES_DB:-bodogami}"

BACKUP_DIR="${BACKUP_DIR:-/backups}"
KEEP_DAYS="${KEEP_DAYS:-7}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

# Optional cloud upload
CLOUD_BACKUP_URL="${CLOUD_BACKUP_URL:-}"
CLOUD_API_KEY="${CLOUD_API_KEY:-}"

# ── Helpers ───────────────────────────────────────────────────────────────────
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

# ── Ensure backup dir ─────────────────────────────────────────────────────────
mkdir -p "$BACKUP_DIR"

# ── Wait for Postgres ─────────────────────────────────────────────────────────
log "Waiting for PostgreSQL (${DB_NAME})…"
until pg_isready -d "$DB_URI" -q; do
  sleep 2
done
log "PostgreSQL ready."

# ── Dump ─────────────────────────────────────────────────────────────────────
# Sem pipe direto pro gzip (evita mascarar falha do pg_dump — sem "pipefail"
# disponível em /bin/sh, um pg_dump que falha no meio não derrubaria o gzip).
log "Starting backup → ${FILENAME}"
DUMP_TMP="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql"
pg_dump \
  -d "$DB_URI" \
  --no-owner \
  --no-acl \
  --format=plain \
  -f "$DUMP_TMP"
gzip "$DUMP_TMP"

SIZE=$(du -sh "$FILENAME" | cut -f1)
log "Backup complete. Size: ${SIZE}"

# ── Cloud upload ──────────────────────────────────────────────────────────────
if [ -n "$CLOUD_BACKUP_URL" ] && [ -n "$CLOUD_API_KEY" ]; then
  log "Uploading to cloud…"
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$CLOUD_BACKUP_URL/upload" \
    -H "X-Api-Key: ${CLOUD_API_KEY}" \
    -F "file=@${FILENAME}" \
    -F "database=${DB_NAME}" \
    -F "timestamp=${TIMESTAMP}" \
    --max-time 120 || echo "000")
  if [ "$STATUS" = "200" ] || [ "$STATUS" = "201" ]; then
    log "Cloud upload OK (HTTP ${STATUS})."
  else
    log "WARNING: Cloud upload failed (HTTP ${STATUS}). Local backup retained."
  fi
else
  log "CLOUD_BACKUP_URL not set — skipping cloud upload."
fi

# ── Rotate old backups ────────────────────────────────────────────────────────
log "Removing backups older than ${KEEP_DAYS} days…"
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime "+${KEEP_DAYS}" -delete
REMAINING=$(find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" | wc -l)
log "Rotation complete. ${REMAINING} backup(s) retained."
