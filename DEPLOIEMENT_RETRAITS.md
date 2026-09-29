# 🚀 Guide de Déploiement - Système de Retrait Partenaires

## ✅ Vérification du script deploy.sh

Le script `deploy.sh` est **correctement configuré** et effectue:
- ✅ Compression du frontend et backend
- ✅ Transfert vers le VPS
- ✅ **Build du frontend** (`npm run build`)
- ✅ **Build du backend** (`npm run build`) 
- ✅ Installation des dépendances
- ✅ Redémarrage PM2

## 📦 Méthodes de Déploiement

### Méthode 1: Déploiement Automatique (Recommandé)

Utilisez le script qui fait **tout automatiquement** (déploiement + migration):

```bash
# Sur votre machine locale
./deploy-with-migration.sh
```

Ce script va:
1. Faire le déploiement complet (frontend + backend)
2. Compiler les deux projets
3. Appliquer automatiquement la migration SQL
4. Redémarrer le backend

### Méthode 2: Déploiement Manuel

Si vous préférez contrôler chaque étape:

```bash
# 1. Déploiement normal
./deploy.sh full

# 2. Sur le VPS, appliquer la migration
ssh votre-vps
cd /var/www/vhosts/docmaster.net/app/Docmaster
./run-migration-psql.sh
pm2 restart DOCMASTER-API_V2
```

### Méthode 3: Frontend uniquement

Si vous n'avez modifié que le frontend:

```bash
./deploy.sh front
```

## 🔍 Vérifications Après Déploiement

### 1. Vérifier que la migration est appliquée

```bash
ssh votre-vps
sudo -u postgres psql -d docmaster -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'withdrawals' AND column_name = 'source_type';"
```

**Résultat attendu:**
```
 column_name 
-------------
 source_type
(1 row)
```

### 2. Vérifier les logs du backend

```bash
ssh votre-vps
pm2 logs DOCMASTER-API_V2 --lines 50
```

### 3. Tester l'API directement

```bash
# Depuis le VPS
curl -s http://localhost:5001/api/settings | grep min_withdrawal_amount
```

**Résultat attendu:** Doit afficher la valeur configurée (ex: "500")

### 4. Tester l'interface web

1. Ouvrir: `https://docmaster.net/partenaire/connexion`
2. Se connecter en tant que partenaire
3. Aller sur "Retraits"
4. Vérifier que:
   - ✅ Le message affiche le bon montant minimum (ex: 500 FCFA)
   - ✅ Le bouton "Demander un retrait" fonctionne
   - ✅ Le formulaire se charge correctement
   - ✅ L'historique s'affiche sans erreur 500

## 🐛 Dépannage

### Erreur: "column w.source_type does not exist"

**Cause:** La migration n'a pas été appliquée.

**Solution:**
```bash
ssh votre-vps
cd /var/www/vhosts/docmaster.net/app/Docmaster
./run-migration-psql.sh
pm2 restart DOCMASTER-API_V2
```

### Le message affiche "1000 FCFA" au lieu de "500 FCFA"

**Cause:** Le frontend n'a pas été recompilé ou le cache du navigateur.

**Solution 1 - Recompiler:**
```bash
./deploy.sh front
```

**Solution 2 - Vider le cache:**
- Chrome/Edge: Ctrl+Shift+Delete → Vider le cache
- Firefox: Ctrl+Shift+Delete → Cocher "Cache" → Effacer
- Ou: Ctrl+F5 (rechargement forcé)

### Erreur 500 sur /api/partenaires/withdrawals

**Cause:** Le backend n'a pas été redémarré après compilation.

**Solution:**
```bash
ssh votre-vps
pm2 restart DOCMASTER-API_V2
pm2 logs DOCMASTER-API_V2 --lines 50
```

## 📋 Checklist Pré-Déploiement

Avant de déployer, vérifiez:

- [ ] Tous les fichiers sont commités (`git status`)
- [ ] Le code compile localement (`npm run build` dans /server et à la racine)
- [ ] Les scripts de migration existent:
  - [ ] `run-migration-psql.sh`
  - [ ] `server/apply_withdrawal_migration.ts`
  - [ ] `server/src/database/shema/67_add_source_type_to_withdrawals.sql`
- [ ] Le fichier `deploy.config.sh` est configuré avec les bonnes infos VPS

## 📝 Notes Importantes

1. **Le script `deploy.sh` fait DÉJÀ le build** du frontend et backend
2. **La migration doit être exécutée UNE SEULE FOIS** par environnement
3. **Toujours tester sur un environnement de staging** avant la production
4. **Faire un backup de la base de données** avant d'appliquer des migrations

## 🎯 Résumé Ultra-Rapide

Pour déployer rapidement:

```bash
# Option 1: Tout automatique
./deploy-with-migration.sh

# Option 2: Étape par étape
./deploy.sh full
# Puis sur le VPS:
./run-migration-psql.sh && pm2 restart DOCMASTER-API_V2
```

**C'est tout!** 🎉
