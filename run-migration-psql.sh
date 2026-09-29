#!/bin/bash

###############################################################################
# Script pour lancer la migration de retrait partenaires avec psql
# Usage: ./run-migration-psql.sh
###############################################################################

set -e  # Arrêter si une commande échoue

echo "🚀 Lancement de la migration de retrait partenaires..."
echo ""

# Vérifier qu'on est dans le bon répertoire
if [ ! -d "server" ]; then
    echo "❌ Erreur: Le dossier 'server' n'existe pas."
    echo "   Assurez-vous d'exécuter ce script depuis la racine du projet."
    exit 1
fi

# Vérifier que le fichier de migration existe
if [ ! -f "server/src/database/shema/67_add_source_type_to_withdrawals.sql" ]; then
    echo "❌ Erreur: Le fichier de migration n'existe pas."
    exit 1
fi

# Charger les variables d'environnement pour obtenir le nom de la DB
if [ -f "server/.env" ]; then
    export $(grep -v '^#' server/.env | grep DB_NAME | xargs)
fi

# Utiliser docmaster par défaut si DB_NAME n'est pas défini
DB_NAME=${DB_NAME:-docmaster}

echo "📦 Application de la migration sur la base de données: $DB_NAME"
echo ""

# Lancer la migration avec psql
sudo -u postgres psql -d "$DB_NAME" -f server/src/database/shema/67_add_source_type_to_withdrawals.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration appliquée avec succès!"
    echo ""
    echo "📋 Vérification de la colonne source_type:"
    sudo -u postgres psql -d "$DB_NAME" -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'withdrawals' AND column_name = 'source_type';"
    echo ""
    echo "📌 Prochaines étapes:"
    echo "   1. Redémarrer le backend: pm2 restart DOCMASTER-API_V2"
    echo "   2. Tester l'endpoint: https://docmaster.net/api/partenaires/withdrawals"
    echo ""
else
    echo ""
    echo "❌ La migration a échoué. Vérifiez les logs ci-dessus."
    exit 1
fi
