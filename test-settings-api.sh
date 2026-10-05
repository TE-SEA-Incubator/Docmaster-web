#!/bin/bash

###############################################################################
# Script pour tester l'API settings
###############################################################################

echo "🧪 Test de l'API Settings..."
echo ""

# Charger DB_NAME depuis .env
if [ -f "server/.env" ]; then
    export $(grep -v '^#' server/.env | grep DB_NAME | xargs)
fi
DB_NAME=${DB_NAME:-docmaster}

echo "📋 Vérification de la valeur dans la base de données:"
sudo -u postgres psql -d "$DB_NAME" -c "SELECT key, value FROM app_settings WHERE key = 'min_withdrawal_amount';"

echo ""
echo "✅ La configuration devrait afficher la valeur correcte."
echo ""
echo "📌 Pour tester l'endpoint API complet:"
echo "   1. Démarrer le serveur: cd server && npm run dev"
echo "   2. Dans un autre terminal: curl http://localhost:3000/api/settings"
echo ""
