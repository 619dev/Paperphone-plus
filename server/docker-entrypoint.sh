#!/bin/sh
set -eu

upload_dir="${UPLOAD_DIR:-./uploads}"
case "$upload_dir" in
  /|.|..|./|../) echo "Refusing unsafe UPLOAD_DIR: $upload_dir" >&2; exit 1 ;;
esac
mkdir -p "$upload_dir"
chown -R 10001:10001 "$upload_dir"

exec gosu 10001:10001 "$@"
