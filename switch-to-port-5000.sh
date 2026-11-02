#!/bin/bash

# Configuration SSH
REMOTE_HOST="217.154.126.24"
REMOTE_USER="root"
REMOTE_PORT="22"
SSH_OPTS="-o ServerAliveInterval=15 -o ServerAliveCountMax=6 -o TCPKeepAlive=yes -o ConnectTimeout=10"

echo "=== Connexion au serveur pour basculer l'API sur le port 5000 ==="

ssh $SSH_OPTS -p "$REMOTE_PORT" "$REMOTE_USER@$REMOTE_HOST" << 'ENDSSH'

echo "=== 1. Vérification des processus sur le port 5000 ==="
lsof -ti:5000 || echo "Aucun processus sur le port 5000"

echo ""
echo "=== 2. Arrêt des processus sur le port 5000 ==="
lsof -ti:5000 | xargs -r kill -9
sleep 2

echo ""
echo "=== 3. Vérification que le port est libéré ==="
lsof -ti:5000 || echo "✓ Port 5000 libéré"

echo ""
echo "=== 4. Modification du fichier .env du backend pour utiliser le port 5000 ==="
cd /var/www/vhosts/docmaster.net/app/Docmaster_Backend_V2

if [ -f ".env" ]; then
    if grep -q "^PORT=" .env; then
        sed -i 's/^PORT=.*/PORT=5000/' .env
        echo "✓ PORT changé en 5000 dans .env"
    else
        echo "PORT=5000" >> .env
        echo "✓ PORT=5000 ajouté à .env"
    fi
    
    echo ""
    echo "Configuration PORT actuelle:"
    grep "^PORT=" .env
else
    echo "✗ Fichier .env introuvable!"
    exit 1
fi

echo ""
echo "=== 5. Redémarrage de l'API sur le nouveau port ==="
pm2 restart DOCMASTER-API_V2 --update-env
sleep 3

echo ""
echo "=== 6. Vérification de l'état PM2 ==="
pm2 list

echo ""
echo "=== 7. Vérification que l'API écoute bien sur le port 5000 ==="
sleep 2
lsof -ti:5000 && echo "✓ API écoute sur le port 5000" || echo "✗ Aucun processus sur le port 5000"

echo ""
echo "=== 8. Test de l'API ==="
curl -s http://localhost:5000/api/health || curl -s http://localhost:5000/ || echo "API non accessible"

pm2 save

ENDSSH

echo ""
echo "✓ Opération terminée!"
