#!/bin/sh
set -eu

api_base_url="${OKOSCOPE_API_BASE_URL:-/}"
api_upstream="${OKOSCOPE_API_UPSTREAM:-}"

case "$api_base_url" in
  /*) ;;
  http://*|https://*) ;;
  *) echo "OKOSCOPE_API_BASE_URL must be a same-origin path or absolute HTTP(S) URL" >&2; exit 1 ;;
esac

case "$api_base_url" in
  *"\\"*|*\"*|*\'*|*" "*|*://*@*) echo "OKOSCOPE_API_BASE_URL contains unsafe characters or credentials" >&2; exit 1 ;;
esac

case "$api_upstream" in
  "") ;;
  http://*|https://*) ;;
  *) echo "OKOSCOPE_API_UPSTREAM must be an absolute HTTP(S) origin" >&2; exit 1 ;;
esac

case "$api_upstream" in
  *[!A-Za-z0-9.:_/-]*|*://*@*|*\?*|*\#*)
    echo "OKOSCOPE_API_UPSTREAM contains unsafe characters, credentials, or a query" >&2
    exit 1
    ;;
esac

case "$api_upstream" in
  http://*/*|https://*/*)
    echo "OKOSCOPE_API_UPSTREAM must be an origin without a path or trailing slash" >&2
    exit 1
    ;;
esac

rm -rf /tmp/okoscope-web
mkdir -p /tmp/okoscope-web
cp -R /opt/okoscope/dist/. /tmp/okoscope-web/
printf 'window.__OKOSCOPE_CONFIG__ = { apiBaseUrl: "%s" };\n' "$api_base_url" > /tmp/okoscope-web/config.js

if [ -n "$api_upstream" ]; then
  cat > /tmp/okoscope-api-location.conf <<EOF
location = /api {
  proxy_pass ${api_upstream};
  proxy_http_version 1.1;
  proxy_set_header Host \$host;
  proxy_set_header X-Forwarded-Host \$host;
  proxy_set_header X-Forwarded-Proto \$scheme;
  proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
}

location ^~ /api/ {
  proxy_pass ${api_upstream};
  proxy_http_version 1.1;
  proxy_set_header Host \$host;
  proxy_set_header X-Forwarded-Host \$host;
  proxy_set_header X-Forwarded-Proto \$scheme;
  proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
}
EOF
else
  cat > /tmp/okoscope-api-location.conf <<'EOF'
location = /api { return 502; }
location ^~ /api/ { return 502; }
EOF
fi

exec "$@"
