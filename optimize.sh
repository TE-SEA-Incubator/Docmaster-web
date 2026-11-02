#!/bin/bash

# ═══════════════════════════════════════════════════════════════════
# Script d'optimisation DocMaster
# ═══════════════════════════════════════════════════════════════════

echo "🚀 Optimisation DocMaster - Début"
echo ""

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. Installer dépendances optimisation
echo -e "${BLUE}📦 Installation dépendances...${NC}"
npm install --save-dev terser compression @types/compression
echo -e "${GREEN}✅ Dépendances installées${NC}"
echo ""

# 2. Créer index database
echo -e "${BLUE}🗄️  Création index database...${NC}"
PGPASSWORD="Aboubakar2378." psql -h localhost -U docmaster_user -d docmaster -f server/src/database/shema/69_performance_indexes.sql
echo -e "${GREEN}✅ Index créés${NC}"
echo ""

# 3. Build optimisé
echo -e "${BLUE}🏗️  Build frontend optimisé...${NC}"
npm run build
echo -e "${GREEN}✅ Build terminé${NC}"
echo ""

# 4. Analyser taille bundles
echo -e "${BLUE}📊 Analyse des bundles...${NC}"
du -sh dist/assets/*.js | sort -hr | head -10
echo ""

# 5. Redémarrer serveur
echo -e "${BLUE}🔄 Redémarrage serveur...${NC}"
pm2 restart docmaster-api
echo -e "${GREEN}✅ Serveur redémarré${NC}"
echo ""

echo -e "${GREEN}🎉 Optimisation terminée !${NC}"
echo ""
echo "📈 Prochaines étapes :"
echo "  1. Tester la vitesse : https://pagespeed.web.dev/"
echo "  2. Vérifier cache : curl -I https://docmaster.net/assets/main-*.js"
echo "  3. Monitoring : pm2 monit"
echo ""
