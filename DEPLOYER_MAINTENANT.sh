#!/bin/bash
# 🚀 SCRIPT DE DÉPLOIEMENT ULTRA-RAPIDE
# Copiez et exécutez ce script sur votre VPS

echo "╔══════════════════════════════════════════════════════╗"
echo "║   🚀 DÉPLOIEMENT SYSTÈME RETRAIT PARTENAIRES        ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# Aller dans le projet
cd /root/Docmaster-web || { echo "❌ Projet introuvable"; exit 1; }

echo "📥 Récupération du code..."
git pull origin main

echo "🗄️  Application de la migration..."
cd server
npx tsx apply_withdrawal_migration.ts || psql -U postgres -d docmaster -f src/database/shema/67_add_source_type_to_withdrawals.sql

echo "⚙️  Configuration montant minimum..."
psql -U postgres -d docmaster -c "INSERT INTO app_settings (key, value, description) VALUES ('min_withdrawal_amount', '1000', 'Montant minimum de retrait en FCFA') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;" 2>/dev/null

echo "🔨 Compilation backend..."
npm run build

echo "🔄 Redémarrage backend..."
pm2 restart all || sudo systemctl restart docmaster-api

echo "🎨 Compilation frontend..."
cd ..
npm run build

echo "🌐 Rechargement nginx..."
sudo systemctl reload nginx 2>/dev/null

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║              ✅ DÉPLOIEMENT TERMINÉ !               ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "🎉 Les partenaires peuvent maintenant :"
echo "   • Accéder à /partenaire/retraits"
echo "   • Demander des retraits Mobile Money"
echo "   • Voir l'historique"
echo ""
echo "🔍 Vérification :"
echo "   pm2 logs --lines 50"
echo "   psql -U postgres -d docmaster -c '\d withdrawals'"
echo ""
