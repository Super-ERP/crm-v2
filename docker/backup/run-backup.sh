#!/bin/sh
set -eu

: "${DATABASE_ADMIN_URL:?DATABASE_ADMIN_URL must be set}"
: "${BACKUP_AGE_RECIPIENT:?BACKUP_AGE_RECIPIENT must be set}"

interval=${BACKUP_INTERVAL_SECONDS:-86400}
retention_days=${BACKUP_RETENTION_DAYS:-35}
backup_dir=/backups/encrypted
status_file=/backups/status.env
work_dir=/var/lib/backup/work

write_status() {
  result=$1
  timestamp=$2
  artifact=${3:-}
  checksum=${4:-}
  reason=${5:-}
  remote_verified=${6:-false}
  prior_success=""
  prior_restore=""
  if [ -r "$status_file" ]; then
    prior_success=$(awk -F= '$1 == "LAST_SUCCESS_AT_EPOCH" { print $2 }' "$status_file")
    prior_restore=$(awk -F= '$1 == "LAST_RESTORE_TEST_AT_EPOCH" { print $2 }' "$status_file")
  fi
  temp_status="$status_file.tmp"
  umask 077
  {
    printf 'STATUS_VERSION=1\n'
    printf 'RESULT=%s\n' "$result"
    printf 'LAST_ATTEMPT_AT_EPOCH=%s\n' "$timestamp"
    if [ "$result" = success ]; then
      printf 'LAST_SUCCESS_AT_EPOCH=%s\n' "$timestamp"
    elif [ -n "$prior_success" ]; then
      printf 'LAST_SUCCESS_AT_EPOCH=%s\n' "$prior_success"
    fi
    [ -z "$prior_restore" ] || printf 'LAST_RESTORE_TEST_AT_EPOCH=%s\n' "$prior_restore"
    printf 'ARTIFACT=%s\n' "$artifact"
    printf 'SHA256=%s\n' "$checksum"
    printf 'FAILURE_REASON=%s\n' "$reason"
    printf 'REMOTE_VERIFIED=%s\n' "$remote_verified"
  } > "$temp_status"
  mv -f "$temp_status" "$status_file"
}

backup_once() {
  epoch=$(date +%s)
  stamp=$(date -u +%Y%m%dT%H%M%SZ)
  workspace=$(mktemp -d "$work_dir/backup.XXXXXX")
  verify_db="crm_backup_verify_${epoch}_$$"
  base_url=${DATABASE_ADMIN_URL%/*}/postgres
  verify_url=${DATABASE_ADMIN_URL%/*}/$verify_db
  artifact="$backup_dir/crm-$stamp.tar.age"

  cleanup() {
    psql "$base_url" -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS \"$verify_db\"" >/dev/null 2>&1 || true
    rm -rf "$workspace"
  }
  trap cleanup EXIT HUP INT TERM

  pg_dump --format=custom --file="$workspace/database.dump" "$DATABASE_ADMIN_URL"
  tar -czf "$workspace/uploads.tar.gz" -C /data/uploads .
  psql "$base_url" -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"$verify_db\"" >/dev/null
  pg_restore --exit-on-error --no-owner --no-privileges -d "$verify_url" "$workspace/database.dump" >/dev/null
  table_count=$(psql "$verify_url" -v ON_ERROR_STOP=1 -Atc "select count(*) from information_schema.tables where table_schema='public'")
  [ "$table_count" -gt 0 ]
  psql "$base_url" -v ON_ERROR_STOP=1 -c "DROP DATABASE \"$verify_db\"" >/dev/null

  tar -cf "$workspace/backup.tar" -C "$workspace" database.dump uploads.tar.gz
  mkdir -p "$backup_dir"
  age -r "$BACKUP_AGE_RECIPIENT" -o "$artifact.tmp" "$workspace/backup.tar"
  mv -f "$artifact.tmp" "$artifact"
  checksum=$(sha256sum "$artifact" | awk '{print $1}')
  printf '%s  %s\n' "$checksum" "$(basename "$artifact")" > "$artifact.sha256"
  remote_verified=false
  if [ -n "${BACKUP_REMOTE_TARGET:-}" ]; then
    remote_base=${BACKUP_REMOTE_TARGET%/}
    rclone copyto "$artifact" "$remote_base/$(basename "$artifact")"
    rclone copyto "$artifact.sha256" "$remote_base/$(basename "$artifact.sha256")"
    remote_verified=true
  elif [ "${BACKUP_REQUIRE_OFFSITE:-false}" = true ]; then
    return 1
  fi
  find "$backup_dir" -type f -mtime "+$retention_days" -delete
  write_status success "$epoch" "$artifact" "$checksum" "" "$remote_verified"
  trap - EXIT HUP INT TERM
  cleanup
}

mkdir -p "$backup_dir" "$work_dir"
if [ "${1:-}" = "--once" ]; then
  backup_once
  exit 0
fi
while :; do
  attempt=$(date +%s)
  if ! /opt/backup/run-backup.sh --once; then
    write_status error "$attempt" "" "" backup_failed
  fi
  sleep "$interval"
done
