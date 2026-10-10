#!/usr/bin/env bash
exec "$(cd "$(dirname "$0")/../.." && pwd)/_ops/deploy/spot-the-song/deploy_production.sh" "$@"
