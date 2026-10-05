# 🎁 Codes de Parrainage pour les Administrateurs

## 📋 Vue d'ensemble

Le système génère automatiquement un **code de parrainage unique** (8 caractères alphanumériques) pour chaque utilisateur lors de l'inscription. Cependant, les **administrateurs créés manuellement** peuvent ne pas avoir de code.

## 🔍 Vérifier les codes existants

### Sur votre machine locale
```bash
cd server
npx tsx show_admin_referral_codes.ts
```

### Sur le VPS
```bash
ssh root@votre-vps
cd /var/www/vhosts/docmaster.net/app/Docmaster/server
npx tsx show_admin_referral_codes.ts
```

**Résultat attendu :**
```
═══════════════════════════════════════════════════════════
   📋 CODES DE PARRAINAGE DES ADMINISTRATEURS
═══════════════════════════════════════════════════════════

Nombre d'administrateurs: 2

1. John Doe
   Email: admin@docmaster.net
   Code de parrainage: ABC12XYZ
   Nombre de filleuls: 5
   Créé le: 15/01/2026

2. Jane Smith
   Email: admin2@docmaster.net
   Code de parrainage: ❌ AUCUN CODE
   Nombre de filleuls: 0
   Créé le: 20/03/2026

═══════════════════════════════════════════════════════════
📊 STATISTIQUES:
   Admins avec code: 1/2
   ⚠️  Admins SANS code: 1

   💡 Exécutez: npx tsx generate_missing_referral_codes.ts
═══════════════════════════════════════════════════════════
```

---

## 🚀 Générer les codes manquants

### Sur votre machine locale
```bash
cd server
npx tsx generate_missing_referral_codes.ts
```

### Sur le VPS
```bash
ssh root@votre-vps
cd /var/www/vhosts/docmaster.net/app/Docmaster/server
npx tsx generate_missing_referral_codes.ts
```

**Résultat attendu :**
```
🔄 Génération des codes de parrainage manquants...

📋 3 utilisateur(s) sans code de parrainage trouvé(s):

✅ John Doe (admin@docmaster.net) [ADMIN] → ABC12XYZ
✅ Jane Smith (user@example.com) [USER] → XYZ98ABC
✅ Bob Martin (bob@example.com) [USER] → DEF45GHI

📊 Résumé:
   ✅ Codes générés: 3

📈 Statistiques globales:
   Total utilisateurs: 150
   Avec code: 150
   Sans code: 0

✅ Script terminé avec succès !
```

---

## 📖 Comment fonctionne le système de parrainage ?

### 1. **Génération automatique**
Lors de l'inscription d'un nouvel utilisateur :
```typescript
// Code généré automatiquement (8 caractères)
code_invitation: "ABC12XYZ"
```

### 2. **Utilisation du code**
Un nouvel utilisateur peut s'inscrire avec le code d'un parrain :
```json
{
  "nom": "Dupont",
  "prenom": "Pierre",
  "email": "pierre@example.com",
  "mot_de_passe": "password123",
  "code_parrainage": "ABC12XYZ"  // Code du parrain (admin ou user)
}
```

### 3. **Récompenses**
Le système de référence (`referrals` table) enregistre :
- Le parrain (`referred_by`)
- Le filleul (`referred_user`)
- Les points/récompenses éventuels

---

## 🎯 Utilisation pratique

### Scénario 1 : Admin veut parrainer des utilisateurs

```bash
# 1. Vérifier son code
npx tsx show_admin_referral_codes.ts

# 2. Si pas de code, en générer un
npx tsx generate_missing_referral_codes.ts

# 3. Partager le code
# L'admin peut maintenant partager son code avec des nouveaux utilisateurs
```

### Scénario 2 : Nouvelle inscription avec parrainage admin

**Frontend (formulaire d'inscription) :**
```typescript
// L'utilisateur entre le code de l'admin
{
  code_parrainage: "ABC12XYZ"  // Code de l'admin
}
```

**Backend (vérification) :**
- Le système vérifie que le code existe
- Lie le nouvel utilisateur à l'admin (parrain)
- Enregistre la relation dans la table `referrals`

---

## 🔧 Commandes SQL utiles

### Voir tous les codes de parrainage
```sql
SELECT 
  nom, 
  prenom, 
  email, 
  code_invitation, 
  role,
  (SELECT COUNT(*) FROM users WHERE parrain_id = u.id) as filleuls
FROM users u
WHERE role = 'ADMIN'
ORDER BY nom;
```

### Voir les filleuls d'un admin
```sql
SELECT 
  u.nom,
  u.prenom,
  u.email,
  u.created_at,
  parrain.email as parrain_email,
  parrain.code_invitation as code_parrain
FROM users u
JOIN users parrain ON u.parrain_id = parrain.id
WHERE parrain.role = 'ADMIN'
ORDER BY u.created_at DESC;
```

### Générer un code manuel (PostgreSQL)
```sql
-- Générer et assigner un code à un utilisateur spécifique
UPDATE users 
SET code_invitation = UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8))
WHERE email = 'admin@docmaster.net' 
AND (code_invitation IS NULL OR code_invitation = '');
```

---

## 📊 Statistiques de parrainage

### Dashboard Admin
Les stats de parrainage sont déjà affichées dans `/admin/referrals` :
- Nombre total de parrainages
- Top parrains (incluant les admins)
- Historique des références

### API Endpoint existant
```
GET /api/admin/referrals
```

---

## ✅ Checklist de déploiement

- [ ] Pusher les nouveaux scripts vers Git
- [ ] Se connecter au VPS
- [ ] Récupérer le code (`git pull`)
- [ ] Vérifier les codes existants
- [ ] Générer les codes manquants
- [ ] Vérifier que tous les admins ont un code
- [ ] Partager les codes avec les admins concernés

---

## 🎉 Résultat

Maintenant, **tous les administrateurs ont un code de parrainage** qu'ils peuvent partager pour recruter de nouveaux utilisateurs !

Les nouveaux utilisateurs qui s'inscrivent avec le code d'un admin seront automatiquement liés à cet admin comme parrain.
