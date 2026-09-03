#!/bin/sh
set -eu
status=/backups/status.env
max_age=${BACKUP_MAX_AGE_SECONDS:-93600}
[ -r "$status" ] || exit 1
result=$(awk -F= '$1 == "RESULT" { print $2 }' "$status")
last_success=$(awk -F= '$1 == "LAST_SUCCESS_AT_EPOCH" { print $2 }' "$status")
[ "$result" = success ] && [ -n "$last_success" ]
[ $(( $(date +%s) - last_success )) -le "$max_age" ]
