#!/bin/bash

###############################################################################
# Script de déploiement avec migration automatique pour les retraits
# Usage: ./deploy-with-migration.sh
###############################################################################

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 Déploiement avec migration des retraits partenaires..."
echo ""

# 1. Exécuter le déploiement normal (full)
echo "📦 Étape 1: Déploiement complet..."
"$SCRIPT_DIR/deploy.sh" full

if [ $? -ne 0 ]; then
    echo "❌ Le déploiement a échoué!"
    exit 1
fi

echo ""
echo "📦 Étape 2: Application de la migration sur le VPS..."

# Charger la configuration
if [ -f "$SCRIPT_DIR/deploy.config.sh" ]; then
    source "$SCRIPT_DIR/deploy.config.sh"
else
    echo "❌ Fichier de configuration deploy.config.sh introuvable !"
    exit 1
fi

# 2. Exécuter la migration sur le VPS
ssh -p "$REMOTE_PORT" "$REMOTE_USER@$REMOTE_HOST" << 'REMOTE_MIGRATION'
    set -e
    
    echo "🔄 Application de la migration withdrawal..."
    cd /var/www/vhosts/docmaster.net/app/Docmaster
    
    # Vérifier que le script de migration existe
    if [ ! -f "run-migration-psql.sh" ]; then
        echo "❌ Script run-migration-psql.sh introuvable!"
        exit 1
    fi
    
    # Rendre le script exécutable
    chmod +x run-migration-psql.sh
    
    # Exécuter la migration
    ./run-migration-psql.sh
    
    if [ $? -eq 0 ]; then
        echo "✅ Migration appliquée avec succès!"
    else
        echo "❌ La migration a échoué!"
        exit 1
    fi
    
    echo ""
    echo "♻️ Redémarrage du backend..."
    pm2 restart DOCMASTER-API_V2
    
    echo "✅ Backend redémarré!"
REMOTE_MIGRATION

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Déploiement et migration terminés avec succès!"
    echo ""
    echo "📋 Vérifications à faire:"
    echo "   1. Tester la page: https://docmaster.net/partenaire/retraits"
    echo "   2. Vérifier les logs: pm2 logs DOCMASTER-API_V2 --lines 50"
    echo ""
else
    echo ""
    echo "❌ La migration a échoué. Vérifiez les logs sur le VPS."
    exit 1
fi
