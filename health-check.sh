#!/bin/bash

# Charger la configuration pour récupérer les accès SSH
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/deploy.config.sh" ]; then
    source "$SCRIPT_DIR/deploy.config.sh"
else
    REMOTE_USER="root"
    REMOTE_HOST="217.154.126.24"
    REMOTE_PORT="22"
fi

echo -e "\033[0;34m[INFO]\033[0m Connexion au serveur pour analyse médicale du système..."

ssh -p "$REMOTE_PORT" "$REMOTE_USER@$REMOTE_HOST" << 'HEALTH_SCRIPT'
echo -e "\n=== 1. DISQUE ET MÉMOIRE ==="
df -h / | grep -v Filesystem
echo -e "\nMémoire RAM :"
free -h

echo -e "\n=== 2. STATUT DES VERSIONS ==="
echo -n "NodeJS : " && node -v
echo -n "NPM    : " && npm -v

echo -e "\n=== 3. ETAT DES PROCESSUS PM2 ==="
if command -v pm2 >/dev/null 2>&1; then
    pm2 list
else
    echo "PM2 n'est pas installé globalement."
fi

echo -e "\n=== 4. ECOUTE DES PORTS (5000 & 5174) ==="
sudo ss -tunlp | grep -E '5000|5174' || echo "Aucun service n'écoute sur les ports 5000 ou 5174"
HEALTH_SCRIPT