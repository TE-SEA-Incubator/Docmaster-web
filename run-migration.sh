#!/bin/bash

###############################################################################
# Script pour lancer la migration de retrait partenaires
# Usage: ./run-migration.sh
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

# Aller dans le dossier server
cd server

# Vérifier que le fichier de migration existe
if [ ! -f "apply_withdrawal_migration.ts" ]; then
    echo "❌ Erreur: Le fichier 'apply_withdrawal_migration.ts' n'existe pas."
    exit 1
fi

# Lancer la migration
echo "📦 Application de la migration..."
npx tsx apply_withdrawal_migration.ts

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration appliquée avec succès!"
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
