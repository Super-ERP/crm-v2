#!/bin/sh

set -eu

uid=$(id -u)
if [ "$uid" -ne 10001 ]; then
  echo "backup runtime must run as uid 10001, got: $uid" >&2
  exit 1
fi

postgres_version=$(pg_dump --version)
case "$postgres_version" in
  *" 17."*) ;;
  *)
    echo "expected PostgreSQL 17 pg_dump, got: $postgres_version" >&2
    exit 1
    ;;
esac

age_version=$(age --version)
case "$age_version" in
  *"1.2.1"*) ;;
  *)
    echo "expected age 1.2.1, got: $age_version" >&2
    exit 1
    ;;
esac

rsync_version=$(rsync --version | sed -n '1p')
case "$rsync_version" in
  *"version 3.5.0"*) ;;
  *)
    echo "expected rsync 3.5.0, got: $rsync_version" >&2
    exit 1
    ;;
esac

ssh_version=$(ssh -V 2>&1)
case "$ssh_version" in
  *"OpenSSH_10.2"*) ;;
  *)
    echo "expected OpenSSH 10.2, got: $ssh_version" >&2
    exit 1
    ;;
esac

package_version() {
  awk -v package="$1" '
    $0 == "P:" package { found = 1; next }
    found && /^V:/ { sub(/^V:/, ""); print; exit }
    /^$/ { found = 0 }
  ' /lib/apk/db/installed
}

for package_pin in \
  age=1.2.1-r15 \
  ca-certificates=20260611-r0 \
  libpq=18.6-r0 \
  libcrypto3=3.5.8-r0 \
  libssl3=3.5.8-r0 \
  libncursesw=6.5_p20251123-r0 \
  lz4-libs=1.10.0-r0 \
  ncurses-terminfo-base=6.5_p20251123-r0 \
  postgresql-common=1.2-r2 \
  postgresql17-client=17.11-r0 \
  readline=8.3.1-r0 \
  rsync=3.5.0-r0 \
  openssh-client-default=10.2_p1-r0 \
  tzdata=2026c-r0 \
  zstd-libs=1.5.7-r2
do
  package=${package_pin%%=*}
  expected=${package_pin#*=}
  actual=$(package_version "$package")
  if [ "$actual" != "$expected" ]; then
    echo "expected $package $expected, got: ${actual:-missing}" >&2
    exit 1
  fi
done

postgres_semver=${postgres_version##* }
age_semver=${age_version#v}
rsync_semver=$(printf '%s\n' "$rsync_version" | awk '{ print $3 }')
ssh_semver=$(printf '%s\n' "$ssh_version" | sed 's/^OpenSSH_//; s/[ ,].*$//')

printf 'uid=%s postgresql=%s age=%s rsync=%s openssh=%s packages=pinned\n' \
  "$uid" "$postgres_semver" "$age_semver" "$rsync_semver" "$ssh_semver"
