#!/usr/bin/env bash

cd "$(dirname "$0")/.." || exit 1

set -euo pipefail

COMMIT_MESSAGE=""
SKIP_COMMIT=false
DEPLOY_KEY="../keys/prometheus_key.pem"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-commit)
      SKIP_COMMIT=true
      shift
      ;;
    *)
      COMMIT_MESSAGE="$1"
      shift
      ;;
  esac
done

COMMIT_MESSAGE="${COMMIT_MESSAGE:-Deploy production $(date -u +%Y-%m-%dT%H:%M:%SZ)}"

echo "==> Running preflight checks..."

echo "==> Typechecking..."
npm run typecheck

echo "==> Building for production..."
npm run build

echo "==> Committing and pushing to GitHub..."
if [[ "$SKIP_COMMIT" == true ]]; then
  echo "Skipping git commit/push (--no-commit)."
elif [[ -n "$(git status --porcelain)" ]]; then
  git add -A
  git commit -m "$(cat <<EOF
$COMMIT_MESSAGE
EOF
)"
  if git rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then
    git push
  else
    echo "No upstream branch — skipped git push."
  fi
  echo "Committed local changes."
else
  echo "No local changes to commit. Skipping git commit/push."
fi

if [[ ! -f "$DEPLOY_KEY" ]]; then
  echo "Deploy key not found at $DEPLOY_KEY" >&2
  exit 1
fi

echo "==> Publishing frontend (static Vite build)..."
bash scripts/publish_production_frontend.sh

echo "==> Publishing server (PM2) + nginx..."
bash scripts/publish_production_server.sh

echo "✅ Production deploy complete"
echo "   App:  /home/ec2-user/spot-the-song (API) + /var/www/spot-the-song.samirrodriguez.click (static)"
echo "   API:  PM2 spot-the-song → :3500"
echo "   Site: https://spot-the-song.samirrodriguez.click"
echo "   Reminder: ensure server/.env exists on EC2 with production values:"
echo "     CLIENT_ORIGIN=https://spot-the-song.samirrodriguez.click"
echo "     SPOTIFY_REDIRECT_URI=https://spot-the-song.samirrodriguez.click/api/spotify/callback"
