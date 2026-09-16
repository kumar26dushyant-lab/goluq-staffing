#!/usr/bin/env bash
# Update GoLuQ on the VM (native systemd install): pull, rebuild, restart.
#   Live box since 2026-09-17: Oracle Mumbai — ssh ubuntu@152.67.29.92 'sudo bash /opt/goluq/deploy/update.sh'
#   cd /opt/goluq && bash deploy/update.sh
set -e
cd "$(dirname "$0")/.."
echo "→ pulling latest…"; git pull
echo "→ installing deps…"; npm ci
echo "→ building SPA…"; npm run build
echo "→ bundling server…"; npm run build:server
echo "→ restarting service…"; systemctl restart goluq
sleep 1; systemctl is-active goluq && echo "✅ GoLuQ updated & running."
