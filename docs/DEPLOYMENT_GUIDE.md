# 🚀 Docmaster Deployment Automation Guide

Guide complet pour automatiser le déploiement de Docmaster sur votre serveur de production.

## 📋 Table des Matières

1. [Configuration Initiale](#configuration-initiale)
2. [Scripts Disponibles](#scripts-disponibles)
3. [Installation des Prérequis](#installation-des-prérequis)
4. [Utilisation](#utilisation)
5. [Dépannage](#dépannage)
6. [Sécurité](#sécurité)

---

## 🔧 Configuration Initiale

### 1. Prérequis Locaux (sur votre machine)

```bash
# Installer 7z pour la compression
sudo apt-get update
sudo apt-get install p7zip-full

# Vérifier les installations
which ssh scp 7z npm
```

### 2. Configurer SSH (Accès sans mot de passe)

```bash
# Générer une clé SSH si vous n'en avez pas
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa

# Copier la clé sur le serveur
ssh-copy-id root@217.154.126.24

# Tester la connexion
ssh root@217.154.126.24 "echo 'SSH OK'"
```

### 3. Préparer le Serveur

```bash
# Se connecter au serveur
ssh root@217.154.126.24

# Créer le répertoire de déploiement
mkdir -p /root/docmaster
cd /root/docmaster

# Installer Node.js (si ce n'est pas déjà fait)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Installer PM2 pour gérer les services
npm install -g pm2

# Vérifier les versions
node --version
npm --version
pm2 --version
```

### 4. Configuration de l'Application sur le Serveur

```bash
# Sur le serveur: créer le fichier .env pour la production
cat > /root/docmaster/.env.production << 'EOF'
# Server Configuration
NODE_ENV=production
PORT=4000
HOST=0.0.0.0

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=docmaster
DB_USER=docmaster_user
DB_PASSWORD=your_secure_password
DB_POOL_MIN=2
DB_POOL_MAX=10

# JWT
JWT_SECRET=your_very_long_random_secret_key_min_32_chars
JWT_EXPIRATION=7d

# API Keys
NOKASH_API_KEY=your_nokash_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=/root/docmaster/uploads

# Frontend URL
FRONTEND_URL=https://your-domain.com
API_URL=https://your-domain.com/api

# Logging
LOG_LEVEL=info
LOG_DIR=/var/log/docmaster
EOF
```

---

## 📚 Scripts Disponibles

### 1. `deploy.sh` - Déploiement Complet (Automatisé)

**Description:** Effectue un déploiement complet avec compression, upload et déploiement.

**Fonctionnalités:**
- ✅ Compression intelligente du projet
- ✅ Upload sécurisé via SCP
- ✅ Sauvegarde automatique du déploiement précédent
- ✅ Installation des dépendances
- ✅ Compilation TypeScript
- ✅ Redémarrage des services (optionnel)

**Usage:**
```bash
cd /home/ruxel/Docmaster
./deploy.sh
```

### 2. `quick-deploy.sh` - Menu Interactif

**Description:** Menu interactif pour les tâches courantes.

**Options:**
```
1) Full Deployment - Déploiement complet
2) Quick Deploy - Upload et déploiement rapide
3) Compress Only - Compresser le projet
4) Upload Only - Upload uniquement
5) Check Server Status - État du serveur
6) Rollback - Restaurer une sauvegarde
7) View Logs - Afficher les logs
```

**Usage:**
```bash
cd /home/ruxel/Docmaster
./quick-deploy.sh
```

### 3. `service-manager.sh` - Gestion des Services

**Description:** Gérer les services (démarrer, arrêter, redémarrer).

**Options:**
```
1) Start - Démarrer le service
2) Stop - Arrêter le service
3) Restart - Redémarrer le service
4) Status - Afficher l'état
5) View Logs - Afficher les 50 dernières lignes
6) Real-time Logs - Logs en temps réel
7) Environment - Variables d'environnement
8) Install Deps - Installer les dépendances
```

**Usage:**
```bash
./service-manager.sh
```

### 4. `health-check.sh` - Vérification de Santé

**Description:** Vérifier l'état global du système et de l'application.

**Vérifications:**
- ✅ Connectivité SSH
- ✅ Informations système
- ✅ Utilisation disque
- ✅ État de l'application
- ✅ Processus en cours
- ✅ État base de données

**Usage:**
```bash
./health-check.sh
```

### 5. `deploy.config.sh` - Fichier de Configuration

**Description:** Configuration centralisée pour tous les scripts.

**À Personnaliser:**
- `REMOTE_USER` - Utilisateur SSH (default: root)
- `REMOTE_HOST` - Adresse du serveur
- `REMOTE_PATH` - Chemin sur le serveur
- `COMPRESSION_LEVEL` - Niveau de compression (1-9)
- `AUTO_RESTART` - Redémarrage automatique

---

## 🔒 Installation des Prérequis

### Sur votre Machine Locale

```bash
# 1. Installer 7z
sudo apt-get install p7zip-full

# 2. Configurer SSH
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa
ssh-copy-id root@217.154.126.24

# 3. Vérifier les permissions des scripts
chmod +x /home/ruxel/Docmaster/*.sh
```

### Sur le Serveur de Production

```bash
# 1. Installer Node.js LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Installer PM2
npm install -g pm2

# 3. Installer PostgreSQL (si nécessaire)
sudo apt-get install postgresql postgresql-contrib

# 4. Créer l'utilisateur de base de données
sudo -u postgres createuser docmaster_user
sudo -u postgres createdb -O docmaster_user docmaster

# 5. Installer 7z sur le serveur
sudo apt-get install p7zip-full

# 6. Créer le répertoire de log
sudo mkdir -p /var/log/docmaster
sudo chown -R $USER:$USER /var/log/docmaster
```

---

## 📖 Utilisation

### Déploiement Complet (Recommandé)

```bash
# 1. Depuis votre machine locale
cd /home/ruxel/Docmaster

# 2. Lancer le déploiement complet
./deploy.sh

# Cela va:
# - Compresser le projet (avec exclusions intelligentes)
# - Uploader l'archive
# - Déployer sur le serveur
# - Installer les dépendances
# - Compiler le TypeScript
# - Proposer le redémarrage des services
```

### Déploiement Rapide (Après une compilation locale)

```bash
./quick-deploy.sh
# Choisir l'option 2 ou 3
```

### Gestion des Services

```bash
# Afficher le menu interactif
./service-manager.sh

# Ou directement avec SSH
ssh root@217.154.126.24 "pm2 status"
ssh root@217.154.126.24 "pm2 logs docmaster"
ssh root@217.154.126.24 "pm2 restart docmaster"
```

### Vérification de Santé

```bash
./health-check.sh

# Affichera:
# - Connectivité
# - Info système
# - Utilisation disque
# - État services
# - Logs récents
```

---

## 🔄 Flux de Déploiement Recommandé

### 1. Avant le Déploiement

```bash
# Vérifier le statut du serveur
./health-check.sh

# Créer une sauvegarde locale
git tag -a "deployment-$(date +%Y%m%d_%H%M%S)" -m "Pre-deployment backup"
git push origin --tags
```

### 2. Déploiement

```bash
# Option A: Déploiement automatisé complet
./deploy.sh

# Option B: Menu interactif
./quick-deploy.sh
```

### 3. Après le Déploiement

```bash
# Vérifier l'état
./service-manager.sh
# Sélectionner l'option 4 (Status)

# Vérifier les logs
./service-manager.sh
# Sélectionner l'option 5 (View Logs)

# Health check final
./health-check.sh
```

---

## 🐛 Dépannage

### Problème: "SSH Connection Refused"

```bash
# Vérifier la connectivité
ssh -v root@217.154.126.24

# Vérifier la clé SSH
ssh-copy-id -i ~/.ssh/id_rsa.pub root@217.154.126.24

# Vérifier le firewall
ssh root@217.154.126.24 "sudo ufw status"
```

### Problème: "7z: command not found"

```bash
# Sur votre machine
sudo apt-get install p7zip-full

# Sur le serveur
ssh root@217.154.126.24 "sudo apt-get install p7zip-full"
```

### Problème: Service ne démarre pas après déploiement

```bash
# Vérifier les logs
./service-manager.sh  # Option 5

# Redémarrer manuellement
ssh root@217.154.126.24 "cd /root/docmaster/Docmaster/server && npm run build && pm2 start dist/server.js"

# Vérifier les dépendances
ssh root@217.154.126.24 "cd /root/docmaster/Docmaster/server && npm install"
```

### Problème: Espace disque insuffisant

```bash
# Vérifier l'utilisation
ssh root@217.154.126.24 "df -h"

# Nettoyer les anciennes sauvegardes
ssh root@217.154.126.24 "ls -lt /root/docmaster/Docmaster.backup.* | tail -n +6 | awk '{print $NF}' | xargs rm -rf"

# Compacter les archives
ssh root@217.154.126.24 "cd /root/docmaster && rm -f old_archives/*.7z"
```

---

## 🔐 Sécurité

### Points Importants

1. **Variables d'Environnement:**
   - Jamais committer `.env` en production
   - Utiliser `.env.production` avec des variables sécurisées
   - Changer les secrets (JWT_SECRET, API_KEYS, etc.)

2. **Permissions SSH:**
   ```bash
   # Vérifier les permissions
   ls -la ~/.ssh/
   # Devraient être: 600 pour id_rsa, 644 pour id_rsa.pub
   
   chmod 700 ~/.ssh
   chmod 600 ~/.ssh/id_rsa
   chmod 644 ~/.ssh/id_rsa.pub
   ```

3. **Firewall:**
   ```bash
   # Sur le serveur
   ssh root@217.154.126.24 "sudo ufw allow 22/tcp"  # SSH
   ssh root@217.154.126.24 "sudo ufw allow 80/tcp"  # HTTP
   ssh root@217.154.126.24 "sudo ufw allow 443/tcp" # HTTPS
   ssh root@217.154.126.24 "sudo ufw enable"
   ```

4. **Sauvegarde des Bases de Données:**
   ```bash
   # Script de sauvegarde
   ssh root@217.154.126.24 << 'BACKUP'
   sudo -u postgres pg_dump docmaster > /root/docmaster/backups/docmaster_$(date +%Y%m%d_%H%M%S).sql
   BACKUP
   ```

---

## 📊 Monitoring en Production

### Avec PM2

```bash
# Installer PM2 Plus (optionnel, pour monitoring web)
npm install -g pm2-plus

# Monitorage local
pm2 monit

# Logs en temps réel
pm2 logs docmaster
```

### Avec Systemctl

```bash
# Créer un service systemd
cat | sudo tee /etc/systemd/system/docmaster-backend.service << 'EOF'
[Unit]
Description=Docmaster Backend Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/docmaster/Docmaster/server
ExecStart=/usr/bin/node dist/server.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Activer le service
sudo systemctl daemon-reload
sudo systemctl enable docmaster-backend
sudo systemctl start docmaster-backend
```

---

## 📞 Support

Pour toute assistance:

1. Vérifier les logs: `./service-manager.sh` → Option 5
2. Health check: `./health-check.sh`
3. Consulter la documentation du projet
4. Vérifier les erreurs TypeScript: `npm run build`

---

**Dernière mise à jour:** May 18, 2026
**Version:** 1.0
**Auteur:** Docmaster Deployment Team
