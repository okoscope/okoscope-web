#!/bin/sh
set -eu

image="${1:-okoscope-web:smoke}"
container="okoscope-web-smoke-$$"
invalid_container="okoscope-web-invalid-$$"

cleanup() {
  docker rm -f "$container" "$invalid_container" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

docker run -d --name "$container" --read-only --tmpfs /tmp:rw,noexec,nosuid,size=32m -p 127.0.0.1::8080 -e OKOSCOPE_API_BASE_URL=https://api.example.test "$image" >/dev/null
port="$(docker port "$container" 8080/tcp | sed 's/.*://')"

attempt=0
until curl -fsS "http://127.0.0.1:$port/healthz" >/dev/null; do
  attempt=$((attempt + 1))
  [ "$attempt" -lt 30 ] || { docker logs "$container"; exit 1; }
  sleep 1
done

curl -fsS "http://127.0.0.1:$port/config.js" | grep -q 'https://api.example.test'
curl -fsSI "http://127.0.0.1:$port/config.js" | grep -qi 'cache-control: no-store'
curl -fsS "http://127.0.0.1:$port/projects/example/applications/example" | grep -q '<div id="root"></div>'
asset="$(curl -fsS "http://127.0.0.1:$port/" | sed -n 's/.*src="\([^"]*\/assets\/[^"]*\.js\)".*/\1/p' | head -1)"
[ -n "$asset" ]
curl -fsSI "http://127.0.0.1:$port$asset" | grep -qi 'immutable'
! docker exec "$container" sh -c 'grep -R "e2e-secret" /tmp/okoscope-web /opt/okoscope 2>/dev/null'

if docker run --name "$invalid_container" --read-only --tmpfs /tmp:rw,noexec,nosuid,size=32m -e OKOSCOPE_API_BASE_URL=ftp://invalid "$image"; then
  echo "invalid configuration unexpectedly started" >&2
  exit 1
fi
