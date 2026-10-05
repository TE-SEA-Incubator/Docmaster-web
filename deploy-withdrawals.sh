#!/bin/bash
# Script de déploiement du système de retrait partenaires
# Usage: ./deploy-withdrawals.sh

set -e  # Arrêter en cas d'erreur

echo "🚀 Déploiement du système de retrait partenaires"
echo "================================================"
echo ""

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
info() {
    echo -e "${GREEN}✓${NC} $1"
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
    exit 1
}

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "package.json" ]; then
    error "Erreur : package.json introuvable. Êtes-vous dans le répertoire racine du projet ?"
fi

echo "📦 Étape 1/6 : Installation des dépendances..."
npm install --silent
cd server
npm install --silent
cd ..
info "Dépendances installées"
echo ""

echo "🗄️  Étape 2/6 : Application de la migration SQL..."
cd server

# Vérifier si le script de migration existe
if [ -f "apply_withdrawal_migration.ts" ]; then
    npx tsx apply_withdrawal_migration.ts || {
        warn "Le script automatique a échoué, essayons manuellement..."
        
        # Demander les informations de connexion
        read -p "Nom d'utilisateur PostgreSQL (défaut: postgres): " DB_USER
        DB_USER=${DB_USER:-postgres}
        
        read -p "Nom de la base de données (défaut: docmaster): " DB_NAME
        DB_NAME=${DB_NAME:-docmaster}
        
        # Appliquer la migration manuellement
        psql -U "$DB_USER" -d "$DB_NAME" -f src/database/shema/67_add_source_type_to_withdrawals.sql || error "Échec de la migration SQL"
    }
else
    warn "Script de migration introuvable, application manuelle..."
    
    read -p "Nom d'utilisateur PostgreSQL (défaut: postgres): " DB_USER
    DB_USER=${DB_USER:-postgres}
    
    read -p "Nom de la base de données (défaut: docmaster): " DB_NAME
    DB_NAME=${DB_NAME:-docmaster}
    
    psql -U "$DB_USER" -d "$DB_NAME" -f src/database/shema/67_add_source_type_to_withdrawals.sql || error "Échec de la migration SQL"
fi

info "Migration appliquée avec succès"
echo ""

echo "⚙️  Étape 3/6 : Configuration du montant minimum..."
read -p "Montant minimum de retrait en FCFA (défaut: 1000): " MIN_AMOUNT
MIN_AMOUNT=${MIN_AMOUNT:-1000}

psql -U "${DB_USER:-postgres}" -d "${DB_NAME:-docmaster}" -c "
INSERT INTO app_settings (key, value, description)
VALUES ('min_withdrawal_amount', '$MIN_AMOUNT', 'Montant minimum de retrait en FCFA')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
" > /dev/null 2>&1 || warn "Configuration du montant minimum échouée (peut-être déjà configuré)"

info "Configuration du montant minimum : $MIN_AMOUNT FCFA"
echo ""

echo "🔨 Étape 4/6 : Compilation du backend..."
npm run build || error "Échec de la compilation du backend"
info "Backend compilé avec succès"
cd ..
echo ""

echo "🎨 Étape 5/6 : Compilation du frontend..."
npm run build || error "Échec de la compilation du frontend"
info "Frontend compilé avec succès"
echo ""

echo "🔄 Étape 6/6 : Redémarrage des services..."

# Détecter le système de gestion de processus
if command -v pm2 &> /dev/null; then
    info "Détection de PM2..."
    pm2 restart all || warn "Impossible de redémarrer avec PM2"
elif command -v systemctl &> /dev/null; then
    info "Détection de systemd..."
    read -p "Nom du service backend (défaut: docmaster-api): " SERVICE_NAME
    SERVICE_NAME=${SERVICE_NAME:-docmaster-api}
    sudo systemctl restart "$SERVICE_NAME" || warn "Impossible de redémarrer le service $SERVICE_NAME"
else
    warn "Aucun gestionnaire de processus détecté (PM2/systemd)"
    warn "Veuillez redémarrer manuellement votre serveur backend"
fi

# Recharger nginx si présent
if command -v nginx &> /dev/null; then
    info "Rechargement de nginx..."
    sudo nginx -t && sudo systemctl reload nginx || warn "Impossible de recharger nginx"
fi

echo ""
echo "================================================"
echo -e "${GREEN}✅ Déploiement terminé avec succès !${NC}"
echo "================================================"
echo ""
echo "🎉 Le système de retrait partenaires est maintenant déployé !"
echo ""
echo "📋 Prochaines étapes :"
echo "   1. Vérifier les logs : pm2 logs (ou journalctl -u docmaster-api)"
echo "   2. Tester la connexion : https://votre-domaine.com/partenaire/connexion"
echo "   3. Naviguer vers : https://votre-domaine.com/partenaire/retraits"
echo ""
echo "📚 Documentation complète : voir DEPLOY_WITHDRAWALS.md"
echo ""
