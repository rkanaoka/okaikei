#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Bodogami — pg_dump backup script
# Runs inside the 'backup' Docker service (or standalone via cron).
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
DB_HOST="${POSTGRES_HOST:-postgres}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_USER="${POSTGRES_USER:-bodogami}"
DB_PASS="${POSTGRES_PASSWORD:-secret}"
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
log "Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT}…"
until PGPASSWORD="$DB_PASS" pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -q; do
  sleep 2
done
log "PostgreSQL ready."

# ── Dump ─────────────────────────────────────────────────────────────────────
log "Starting backup → ${FILENAME}"
PGPASSWORD="$DB_PASS" pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --no-owner \
  --no-acl \
  --format=plain \
  | gzip > "$FILENAME"

SIZE=$(du -sh "$FILENAME" | cut -f1)
log "Backup complete. Size: ${SIZE}"

# ── Cloud upload ──────────────────────────────────────────────────────────────
if [[ -n "$CLOUD_BACKUP_URL" && -n "$CLOUD_API_KEY" ]]; then
  log "Uploading to cloud…"
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$CLOUD_BACKUP_URL/upload" \
    -H "X-Api-Key: ${CLOUD_API_KEY}" \
    -F "file=@${FILENAME}" \
    -F "database=${DB_NAME}" \
    -F "timestamp=${TIMESTAMP}" \
    --max-time 120 || echo "000")
  if [[ "$STATUS" == "200" || "$STATUS" == "201" ]]; then
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
