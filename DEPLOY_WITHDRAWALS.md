# 🚀 Guide de Déploiement - Système de Retrait Partenaires

## Étapes de déploiement sur VPS

### 1️⃣ Pousser les changements vers Git

```bash
# Sur votre machine locale
cd /home/ruxel/Docmaster/Docmaster-web

# Ajouter tous les fichiers modifiés
git add .

# Commit avec un message descriptif
git commit -m "feat: Add partner withdrawal system

- Add withdrawal request and history endpoints
- Create withdrawal UI for partner portal
- Add migration for source_type column in withdrawals table
- Support MTN MoMo and Orange Money payments
- Add complete French translations"

# Pousser vers votre repository
git push origin main  # ou votre branche
```

### 2️⃣ Se connecter au VPS et mettre à jour le code

```bash
# Se connecter au VPS
ssh user@votre-vps-ip

# Aller dans le répertoire du projet
cd /path/to/Docmaster-web

# Récupérer les derniers changements
git pull origin main

# Installer les dépendances (si besoin)
cd server
npm install
cd ..
npm install
```

### 3️⃣ Appliquer la migration SQL

**Option A : Via le script automatique**
```bash
cd server
npx tsx apply_withdrawal_migration.ts
```

**Option B : Manuellement via psql**
```bash
# Se connecter à PostgreSQL
psql -U postgres -d docmaster

# Ou si vous avez un mot de passe
psql -U votre_user -d docmaster -W

# Copier-coller le contenu du fichier SQL ou :
\i server/src/database/shema/67_add_source_type_to_withdrawals.sql

# Vérifier que la colonne a été ajoutée
\d withdrawals

# Quitter
\q
```

**Option C : Via la connexion distante**
```bash
psql -h localhost -U votre_user -d docmaster -f server/src/database/shema/67_add_source_type_to_withdrawals.sql
```

### 4️⃣ Configurer le montant minimum (optionnel)

```bash
psql -U postgres -d docmaster -c "
INSERT INTO app_settings (key, value, description)
VALUES ('min_withdrawal_amount', '1000', 'Montant minimum de retrait en FCFA')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
"
```

### 5️⃣ Compiler et redémarrer le backend

```bash
cd server

# Compiler le TypeScript
npm run build

# Si vous utilisez PM2
pm2 restart docmaster-api
# ou
pm2 restart all

# Si vous utilisez un service systemd
sudo systemctl restart docmaster-api

# Vérifier les logs
pm2 logs docmaster-api
# ou
sudo journalctl -u docmaster-api -f
```

### 6️⃣ Compiler et déployer le frontend

```bash
cd /path/to/Docmaster-web

# Compiler le frontend
npm run build

# Le dossier dist/ contient les fichiers statiques
# Ils seront servis automatiquement par votre serveur web (nginx/apache)

# Si vous utilisez nginx, vérifier la configuration
sudo nginx -t

# Recharger nginx
sudo systemctl reload nginx
```

### 7️⃣ Vérification post-déploiement

#### Vérifier la base de données
```bash
psql -U postgres -d docmaster -c "
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'withdrawals' AND column_name = 'source_type';
"
```

Résultat attendu :
```
 column_name | data_type         | is_nullable | column_default
-------------+-------------------+-------------+----------------
 source_type | character varying | YES         | 'USER'::character varying
```

#### Vérifier l'API
```bash
# Vérifier que le serveur répond
curl -I https://votre-domaine.com/api/health

# Vérifier les routes partenaires (après connexion)
# Vous aurez besoin d'un token JWT valide
```

#### Vérifier le frontend
```bash
# Ouvrir dans le navigateur
https://votre-domaine.com/partenaire/connexion

# Après connexion, naviguer vers
https://votre-domaine.com/partenaire/retraits
```

---

## 🔍 Vérifications de Santé

### Backend
```bash
# Vérifier que le serveur tourne
pm2 status

# Vérifier les logs récents
pm2 logs docmaster-api --lines 50

# Vérifier les processus
ps aux | grep node
```

### Base de données
```bash
# Vérifier la connexion
psql -U postgres -d docmaster -c "SELECT NOW();"

# Vérifier les tables
psql -U postgres -d docmaster -c "\dt"

# Vérifier les retraits existants
psql -U postgres -d docmaster -c "SELECT id, source_type, status, created_at FROM withdrawals ORDER BY created_at DESC LIMIT 5;"
```

### Frontend
```bash
# Vérifier nginx
sudo systemctl status nginx

# Vérifier les logs nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## 🆘 Dépannage

### Problème 1 : Migration échoue

**Erreur : "relation 'withdrawals' does not exist"**
```bash
# Vérifier que la table existe
psql -U postgres -d docmaster -c "\d withdrawals"

# Si elle n'existe pas, créer la table d'abord
psql -U postgres -d docmaster -f server/src/database/shema/22_create_withdrawals.sql
```

**Erreur : "column 'source_type' already exists"**
```bash
# La migration a déjà été appliquée, vérifier :
psql -U postgres -d docmaster -c "SELECT source_type FROM withdrawals LIMIT 1;"
```

### Problème 2 : Backend ne démarre pas

```bash
# Vérifier les erreurs de compilation
cd server
npm run build

# Vérifier les variables d'environnement
cat .env | grep -E "(DB_|DATABASE_)"

# Tester la connexion DB
node -e "const { Pool } = require('pg'); const pool = new Pool({ connectionString: process.env.DATABASE_URL }); pool.query('SELECT NOW()').then(() => console.log('✓ DB OK')).catch(err => console.error('✗ DB Error:', err.message));"
```

### Problème 3 : Frontend ne charge pas la page

```bash
# Vérifier que les fichiers sont présents
ls -la dist/assets/

# Vérifier la configuration nginx
cat /etc/nginx/sites-available/docmaster

# Vérifier les permissions
ls -la dist/
sudo chown -R www-data:www-data dist/
```

### Problème 4 : "Solde insuffisant" alors que le solde est correct

```bash
# Vérifier le solde du partenaire
psql -U postgres -d docmaster -c "
SELECT id, nom_organisation, wallet_balance, statut 
FROM partenaires 
WHERE email = 'email@exemple.com';
"

# Vérifier les retraits en attente
psql -U postgres -d docmaster -c "
SELECT * FROM withdrawals 
WHERE user_id = 'partenaire_id' AND source_type = 'PARTENAIRE' AND status = 'PENDING';
"
```

---

## 📋 Checklist de Déploiement

- [ ] Code poussé vers Git
- [ ] Code récupéré sur le VPS (`git pull`)
- [ ] Migration SQL appliquée
- [ ] Configuration `min_withdrawal_amount` définie
- [ ] Backend compilé (`npm run build`)
- [ ] Backend redémarré (PM2/systemd)
- [ ] Frontend compilé (`npm run build`)
- [ ] Nginx rechargé
- [ ] Tests manuels effectués :
  - [ ] Connexion partenaire
  - [ ] Navigation vers page Retraits
  - [ ] Affichage du solde
  - [ ] Demande de retrait test
  - [ ] Vérification historique
- [ ] Logs vérifiés (pas d'erreurs)
- [ ] Base de données vérifiée

---

## 🔄 Rollback (en cas de problème)

Si quelque chose ne fonctionne pas, vous pouvez revenir en arrière :

### Rollback Git
```bash
# Voir les derniers commits
git log --oneline -5

# Revenir au commit précédent
git reset --hard HEAD~1

# Redéployer
npm run build
pm2 restart all
```

### Rollback Migration SQL
```bash
psql -U postgres -d docmaster -c "
-- Supprimer la colonne source_type
ALTER TABLE withdrawals DROP COLUMN IF EXISTS source_type;

-- Supprimer les indexes
DROP INDEX IF EXISTS idx_withdrawals_source_type;
DROP INDEX IF EXISTS idx_withdrawals_user_source;
"
```

---

## 📞 Support

En cas de problème persistant :
1. Vérifier les logs : `pm2 logs` et `/var/log/nginx/error.log`
2. Vérifier la base de données : `psql -U postgres -d docmaster`
3. Consulter `PARTNER_WITHDRAWALS_IMPLEMENTATION.md` pour plus de détails

---

## ✅ Déploiement Réussi !

Une fois toutes les étapes complétées, votre système de retrait partenaires est en production ! 🎉

Les partenaires peuvent maintenant :
- ✅ Accéder à `/partenaire/retraits`
- ✅ Voir leur solde disponible
- ✅ Demander des retraits vers Mobile Money
- ✅ Suivre l'historique de leurs retraits
