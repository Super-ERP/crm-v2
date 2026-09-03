#!/bin/sh
set -eu
case $# in 3) ;; *) echo "usage: restore-test ARTIFACT AGE_IDENTITY TARGET_DATABASE_URL" >&2; exit 2 ;; esac
artifact=$1
identity=$2
target_url=$3
work=$(mktemp -d /var/lib/backup/work/restore.XXXXXX)
trap 'rm -rf "$work"' EXIT HUP INT TERM
age -d -i "$identity" -o "$work/backup.tar" "$artifact"
tar -xf "$work/backup.tar" -C "$work"
pg_restore --exit-on-error --clean --if-exists --no-owner --no-privileges -d "$target_url" "$work/database.dump"
table_count=$(psql "$target_url" -v ON_ERROR_STOP=1 -Atc "select count(*) from information_schema.tables where table_schema='public'")
[ "$table_count" -gt 0 ]
tar -tzf "$work/uploads.tar.gz" >/dev/null
epoch=$(date +%s)
status=/backups/status.env
temp_status=$status.tmp
if [ -r "$status" ]; then
  awk -F= '$1 != "LAST_RESTORE_TEST_AT_EPOCH" { print }' "$status" > "$temp_status"
else
  printf 'STATUS_VERSION=1\n' > "$temp_status"
fi
printf 'LAST_RESTORE_TEST_AT_EPOCH=%s\n' "$epoch" >> "$temp_status"
mv -f "$temp_status" "$status"
printf 'restore verified at %s from %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$artifact"
