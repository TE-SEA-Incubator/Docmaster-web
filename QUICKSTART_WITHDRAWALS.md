# ⚡ Démarrage Rapide - Système de Retrait Partenaires

## 🎯 En 5 minutes sur votre VPS

### Option 1 : Script Automatique (Recommandé)

```bash
# 1. Se connecter au VPS
ssh user@votre-vps

# 2. Aller dans le projet
cd /path/to/Docmaster-web

# 3. Récupérer les changements
git pull origin main

# 4. Lancer le script de déploiement
./deploy-withdrawals.sh
```

Le script va :
- ✅ Installer les dépendances
- ✅ Appliquer la migration SQL
- ✅ Configurer le montant minimum
- ✅ Compiler backend et frontend
- ✅ Redémarrer les services

---

### Option 2 : Commandes Manuelles

```bash
# 1. Récupérer le code
git pull origin main

# 2. Appliquer la migration
cd server
npx tsx apply_withdrawal_migration.ts

# 3. Compiler et redémarrer
npm run build
pm2 restart all  # ou sudo systemctl restart docmaster-api

# 4. Compiler le frontend
cd ..
npm run build

# 5. Recharger nginx
sudo systemctl reload nginx
```

---

### Option 3 : Migration SQL uniquement

Si vous voulez juste appliquer la migration SQL :

```bash
cd server
psql -U postgres -d docmaster -f src/database/shema/67_add_source_type_to_withdrawals.sql
```

---

## ✅ Vérification Rapide

### Tester que tout fonctionne :

```bash
# 1. Vérifier la base de données
psql -U postgres -d docmaster -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'withdrawals' AND column_name = 'source_type';"

# Résultat attendu : "source_type"

# 2. Vérifier le serveur
pm2 status
# ou
sudo systemctl status docmaster-api

# 3. Ouvrir dans le navigateur
# https://votre-domaine.com/partenaire/retraits
```

---

## 🎉 C'est tout !

Le système est maintenant déployé. Les partenaires peuvent :
- Se connecter sur `/partenaire/connexion`
- Accéder à "Retraits" dans le menu
- Demander des retraits vers Mobile Money
- Voir l'historique de leurs retraits

---

## 📞 Besoin d'aide ?

- **Guide complet** : Voir `DEPLOY_WITHDRAWALS.md`
- **Documentation technique** : Voir `PARTNER_WITHDRAWALS_IMPLEMENTATION.md`
- **Dépannage** : Voir section "Troubleshooting" dans `DEPLOY_WITHDRAWALS.md`
