#!/bin/bash

# Charger la configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/deploy.config.sh" ]; then
    source "$SCRIPT_DIR/deploy.config.sh"
else
    echo "Fichier de configuration deploy.config.sh introuvable !"
    exit 1
fi

# Mode de déploiement (par défaut: full)
DEPLOY_MODE="${1:-full}"

show_usage() {
    echo "Usage: ./deploy.sh [mode]"
    echo ""
    echo "Modes disponibles:"
    echo "  full     - Déploiement complet (compression, transfert, compilation des 2 blocs)"
    echo "  backup   - Juste la sauvegarde et extraction (sans compilation/build)"
    echo "  help     - Afficher cette aide"
    echo ""
}

if [ "$DEPLOY_MODE" = "help" ] || [ "$DEPLOY_MODE" = "-h" ] || [ "$DEPLOY_MODE" = "--help" ]; then
    show_usage
    exit 0
fi

if [ "$DEPLOY_MODE" != "full" ] && [ "$DEPLOY_MODE" != "backup" ]; then
    echo "❌ Mode invalide: $DEPLOY_MODE"
    show_usage
    exit 1
fi

check_local_dependencies() {
    log_info "Vérification des outils locaux..."
    if ! command -v 7z >/dev/null 2>&1; then
        log_error "7-Zip (7z) n'est pas installé sur votre machine locale."
        exit 1
    fi
    log_success "Outils locaux OK"
}

compress_project() {
    cd "$SCRIPT_DIR"
    
    # Nettoyage des anciennes archives locales
    rm -f "$ARCHIVE_FRONT" "$ARCHIVE_BACK"
    
    # 1. Compression du FRONTEND (On exclut explicitement le dossier server et les builds)
    log_info "Compression du Frontend (en excluant le dossier /server)..."
    7z a "$ARCHIVE_FRONT" . \
        -xr!server \
        -xr!node_modules \
        -xr!.git \
        -xr!.github \
        -xr!dist \
        -xr!.env.local \
        -xr!.env.production >/dev/null
        
    # 2. Compression du BACKEND (Uniquement ce qu'il y a dans /server)
    if [ -d "$SCRIPT_DIR/server" ]; then
        log_info "Compression du Backend (Dossier /server)..."
        cd "$SCRIPT_DIR/server"
        7z a "../$ARCHIVE_BACK" . \
            -xr!node_modules \
            -xr!dist \
            -xr!.git >/dev/null
        cd "$SCRIPT_DIR"
    else
        log_error "Dossier /server local introuvable ! Impossible de packager le backend."
        exit 1
    fi
        
    if [ -f "$ARCHIVE_FRONT" ] && [ -f "$ARCHIVE_BACK" ]; then
        log_success "Frontend et Backend compressés avec succès !"
    else
        log_error "Échec de la compression d'une des archives."
        exit 1
    fi
}

transfer_archives() {
    log_info "Transfert des deux archives vers le dossier temporaire du VPS..."
    scp -P "$REMOTE_PORT" "$ARCHIVE_FRONT" "$ARCHIVE_BACK" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/"
    
    if [ $? -eq 0 ]; then
        log_success "Transfert réussi"
        rm -f "$ARCHIVE_FRONT" "$ARCHIVE_BACK" # Nettoyage des archives locales
    else
        log_error "Échec du transfert SSH/SCP"
        exit 1
    fi
}

deploy_on_remote() {
    log_info "Exécution du déploiement V2 sur le VPS..."
    
    ssh -p "$REMOTE_PORT" "$REMOTE_USER@$REMOTE_HOST" -t << REMOTE_SCRIPT
set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m'

REMOTE_PATH="/root"
FRONTEND_DIR="/var/www/vhosts/docmaster.net/app/Docmaster"
BACKEND_DIR="/var/www/vhosts/docmaster.net/app/Docmaster_Backend_V2"
ARCHIVE_FRONT="Docmaster_Frontend.7z"
ARCHIVE_BACK="Docmaster_Backend.7z"
DATE_SUFFIX=\$(date +%Y%m%d_%H%M%S)

# S'assurer que les répertoires parents existent
mkdir -p "/var/www/vhosts/docmaster.net/app"

# --- Extraction & Sauvegarde du FRONTEND ---
echo -e "\${BLUE}[INFO]\${NC} Traitement du Frontend..."
if [ -d "\$FRONTEND_DIR" ]; then
    mv "\$FRONTEND_DIR" "\${FRONTEND_DIR}.backup.\$DATE_SUFFIX"
    echo -e "\${GREEN}[✓]\${NC} Backup Frontend créé : \${FRONTEND_DIR}.backup.\$DATE_SUFFIX"
fi
mkdir -p "\$FRONTEND_DIR"
7z x -y "\$REMOTE_PATH/\$ARCHIVE_FRONT" -o"\$FRONTEND_DIR" >/dev/null
rm -f "\$REMOTE_PATH/\$ARCHIVE_FRONT"

# --- Extraction & Sauvegarde du BACKEND ---
echo -e "\${BLUE}[INFO]\${NC} Traitement du Backend..."
if [ -d "\$BACKEND_DIR" ]; then
    mv "\$BACKEND_DIR" "\${BACKEND_DIR}.backup.\$DATE_SUFFIX"
    echo -e "\${GREEN}[✓]\${NC} Backup Backend créé : \${BACKEND_DIR}.backup.\$DATE_SUFFIX"
fi
mkdir -p "\$BACKEND_DIR"
7z x -y "\$REMOTE_PATH/\$ARCHIVE_BACK" -o"\$BACKEND_DIR" >/dev/null
rm -f "\$REMOTE_PATH/\$ARCHIVE_BACK"

if [ "$DEPLOY_MODE" = "full" ]; then
    # --- 1. CONFIGURATION DU FRONTEND ---
    cd "\$FRONTEND_DIR"
    if [ -f "package.json" ]; then
        echo -e "\${BLUE}[INFO]\${NC} Installation des dépendances Frontend..."
        npm install >/dev/null 2>&1
        echo -e "\${BLUE}[INFO]\${NC} Build Production du Frontend..."
        npm run build >/dev/null 2>&1
        echo -e "\${GREEN}[✓ SUCCESS]\${NC} Frontend buildé avec succès."
    fi

    # --- 2. CONFIGURATION DU BACKEND ---
    cd "\$BACKEND_DIR"
    if [ -f "package.json" ]; then
        echo -e "\${BLUE}[INFO]\${NC} Installation des dépendances Backend..."
        npm install --production >/dev/null 2>&1
        
        if [ -f "tsconfig.json" ]; then
            echo -e "\${BLUE}[INFO]\${NC} Compilation TypeScript du Backend..."
            npm run build >/dev/null 2>&1
        fi
        
        if [ -f ".env.production" ]; then
            cp .env.production .env
        fi
        echo -e "\${GREEN}[✓ SUCCESS]\${NC} Backend configuré avec succès."
    fi
fi

REMOTE_SCRIPT
}

post_deployment() {
    log_info "Phase finale : Redémarrage des nouveaux processus PM2 v2..."
    read -p "Voulez-vous redémarrer vos processus PM2 v2 maintenant ? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ssh -p "$REMOTE_PORT" "$REMOTE_USER@$REMOTE_HOST" << 'RESTART_SCRIPT'
        if command -v pm2 >/dev/null 2>&1; then
            echo "Relancement du Frontend (docmaster-web-v2)..."
            pm2 restart docmaster-web-v2 --update-env || pm2 start /var/www/vhosts/docmaster.net/app/Docmaster/server.js --name "docmaster-web-v2"
            
            echo "Relancement du Backend API (DOCMASTER-API_V2)..."
            pm2 restart DOCMASTER-API_V2 || pm2 start /var/www/vhosts/docmaster.net/app/Docmaster_Backend_V2/dist/index.js --name "DOCMASTER-API_V2"
            
            pm2 save
            echo -e "\033[0;32m✓ Processus PM2 V2 mis à jour et relancés.\033[0m"
        else
            echo -e "\033[0;31m✗ Erreur : PM2 est introuvable sur le VPS.\033[0m"
        fi
RESTART_SCRIPT
    fi
    log_success "DÉPLOIEMENT TERMINÉ AVEC SUCCÈS SUR LA NOUVELLE ARCHITECTURE V2 !"
}

# Lancement de la séquence de déploiement
check_local_dependencies
compress_project
transfer_archives
deploy_on_remote

if [ "$DEPLOY_MODE" = "full" ]; then
    post_deployment
else
    log_success "✓ Sauvegarde et extraction effectuées à vide (Mode backup sans compilation)."
fi