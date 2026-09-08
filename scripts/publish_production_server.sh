#!/usr/bin/env bash

cd "$(dirname "$0")/.." || exit 1

set -euo pipefail

EC2_HOST="ec2-100-55-4-105.compute-1.amazonaws.com"
EC2_USER="ec2-user"
EC2_KEY="../keys/prometheus_key.pem"
REMOTE_APP="/home/ec2-user/spot-the-song"
PM2_NAME="spot-the-song"
APP_PORT="3500"
DOMAIN="spot-the-song.samirrodriguez.click"
NGINX_CONF_LOCAL="scripts/nginx/spot-the-song.samirrodriguez.click.conf"
NGINX_CONF_REMOTE="/etc/nginx/conf.d/spot-the-song.samirrodriguez.click.conf"
CERT_DIR="/etc/letsencrypt/live/${DOMAIN}"

if [[ ! -f "$EC2_KEY" ]]; then
  echo "Deploy key not found at $EC2_KEY" >&2
  exit 1
fi

if [[ ! -f server/dist/index.js ]]; then
  echo "No server build found (server/dist/index.js missing)." >&2
  echo "Run deploy_production.sh (or npm run build) first." >&2
  exit 1
fi

if [[ ! -f shared/dist/index.js ]]; then
  echo "No shared build found (shared/dist/index.js missing)." >&2
  echo "Run deploy_production.sh (or npm run build) first." >&2
  exit 1
fi

echo "🚀 Preparing production app at $REMOTE_APP..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" \
  "mkdir -p \"$REMOTE_APP/server/dist\" \"$REMOTE_APP/shared/dist\""

echo "📦 Uploading workspace manifests..."
export COPYFILE_DISABLE=1

scp -i "$EC2_KEY" \
  package.json \
  package-lock.json \
  "$EC2_USER@$EC2_HOST:$REMOTE_APP/"

scp -i "$EC2_KEY" \
  server/package.json \
  "$EC2_USER@$EC2_HOST:$REMOTE_APP/server/"

scp -i "$EC2_KEY" \
  shared/package.json \
  "$EC2_USER@$EC2_HOST:$REMOTE_APP/shared/"

SERVER_DIST_TARBALL="$(mktemp -t spot-the-song-server-dist-XXXXXX).tar.gz"
tar -C server/dist -czf "$SERVER_DIST_TARBALL" \
  --exclude='._*' \
  --exclude='.DS_Store' \
  .
scp -i "$EC2_KEY" "$SERVER_DIST_TARBALL" "$EC2_USER@$EC2_HOST:$REMOTE_APP/server/dist-deploy.tar.gz"
rm -f "$SERVER_DIST_TARBALL"

SHARED_DIST_TARBALL="$(mktemp -t spot-the-song-shared-dist-XXXXXX).tar.gz"
tar -C shared/dist -czf "$SHARED_DIST_TARBALL" \
  --exclude='._*' \
  --exclude='.DS_Store' \
  .
scp -i "$EC2_KEY" "$SHARED_DIST_TARBALL" "$EC2_USER@$EC2_HOST:$REMOTE_APP/shared/dist-deploy.tar.gz"
rm -f "$SHARED_DIST_TARBALL"

ECOSYSTEM_LOCAL="$(mktemp -t spot-the-song-eco-XXXXXX).cjs"
cat > "$ECOSYSTEM_LOCAL" << EOF
module.exports = {
  apps: [
    {
      name: "${PM2_NAME}",
      cwd: "${REMOTE_APP}/server",
      script: "dist/index.js",
      env: {
        NODE_ENV: "production",
        PORT: "${APP_PORT}",
      },
      max_memory_restart: "400M",
      autorestart: true,
    },
  ],
};
EOF
scp -i "$EC2_KEY" "$ECOSYSTEM_LOCAL" "$EC2_USER@$EC2_HOST:$REMOTE_APP/ecosystem.config.cjs"
rm -f "$ECOSYSTEM_LOCAL"

echo "📥 Installing deps + starting PM2 ($PM2_NAME on :$APP_PORT)..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" << EOF
set -euo pipefail
cd "$REMOTE_APP"

rm -rf server/dist/*
tar -xzf server/dist-deploy.tar.gz -C server/dist
rm -f server/dist-deploy.tar.gz

rm -rf shared/dist/*
tar -xzf shared/dist-deploy.tar.gz -C shared/dist
rm -f shared/dist-deploy.tar.gz

if [[ ! -f server/.env ]]; then
  echo "⚠️  No server/.env at $REMOTE_APP/server/.env"
  echo "   scp -i ../keys/prometheus_key.pem server/.env ec2-user@$EC2_HOST:$REMOTE_APP/server/.env"
  echo "   Set CLIENT_ORIGIN=https://$DOMAIN"
  echo "   Set SPOTIFY_REDIRECT_URI=https://$DOMAIN/api/spotify/callback"
fi

export NVM_DIR="\$HOME/.nvm"
# shellcheck disable=SC1091
[[ -s "\$NVM_DIR/nvm.sh" ]] && . "\$NVM_DIR/nvm.sh"

npm ci --omit=dev

if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
  pm2 delete "$PM2_NAME"
fi
pm2 start "$REMOTE_APP/ecosystem.config.cjs"
pm2 save
pm2 show "$PM2_NAME" | head -40
EOF

echo "🌐 Ensuring nginx + TLS for $DOMAIN..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" "test -d \"$CERT_DIR\"" && CERT_EXISTS=true || CERT_EXISTS=false

if [[ "$CERT_EXISTS" == true ]]; then
  echo "   Certificate already exists — not overwriting nginx (certbot owns SSL blocks)."
else
  echo "   First-time setup: installing HTTP nginx config and requesting a certificate..."
  scp -i "$EC2_KEY" "$NGINX_CONF_LOCAL" "$EC2_USER@$EC2_HOST:/tmp/spot-the-song.samirrodriguez.click.conf"
  ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" << EOF
set -euo pipefail
sudo mkdir -p /var/www/spot-the-song.samirrodriguez.click
sudo install -m 644 /tmp/spot-the-song.samirrodriguez.click.conf "$NGINX_CONF_REMOTE"
rm -f /tmp/spot-the-song.samirrodriguez.click.conf
sudo nginx -t
sudo systemctl restart nginx

if ! sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --redirect --register-unsafely-without-email; then
  echo "⚠️  certbot could not issue a certificate yet."
  echo "   Add a DNS A record: $DOMAIN → 100.55.4.105"
  echo "   Wait for it to resolve, then run:"
  echo "   sudo certbot --nginx -d $DOMAIN"
fi
EOF
fi

echo "✅ Production server publish complete"
echo "   App dir: $REMOTE_APP"
echo "   PM2:     $PM2_NAME (port $APP_PORT)"
echo "   Site:    https://$DOMAIN"
echo "   Socket:  wss://$DOMAIN/socket.io"
echo "   API:     https://$DOMAIN/api/*"
