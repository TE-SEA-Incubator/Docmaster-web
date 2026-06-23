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

# Options supplémentaires
MIGRATE=false
for arg in "$@"; do
    case "$arg" in
        -m|--migrate)
            MIGRATE=true
            ;;
    esac
done

show_usage() {
    echo "Usage: ./deploy.sh [mode]"
    echo ""
    echo "Modes disponibles:"
    echo "  full     - Déploiement complet (compression, transfert, compilation des 2 blocs)"
    echo "  front    - Déploiement uniquement du frontend"
    echo "  backup   - Juste la sauvegarde et extraction (sans compilation/build)"
    echo "  prod     - Bascule le frontend Vite (dev) vers server.js (production avec dist/)"
    echo "  -m|--migrate - Option (exécuter les migrations DB sur le serveur distant)"
    echo "  help     - Afficher cette aide"
    echo ""
}

if [ "$DEPLOY_MODE" = "help" ] || [ "$DEPLOY_MODE" = "-h" ] || [ "$DEPLOY_MODE" = "--help" ]; then
    show_usage
    exit 0
fi

if [ "$DEPLOY_MODE" != "full" ] && [ "$DEPLOY_MODE" != "front" ] && [ "$DEPLOY_MODE" != "backup" ] && [ "$DEPLOY_MODE" != "prod" ]; then
    echo "❌ Mode invalide: $DEPLOY_MODE"
    show_usage
    exit 1
fi

check_local_tools() {
    log_info "Vérification des outils locaux..."
    if ! command -v 7z >/dev/null 2>&1; then
        log_error "7-Zip (7z) n'est pas installé localement sur votre machine."
        exit 1
    fi
    if ! command -v scp >/dev/null 2>&1; then
        log_error "L'outil de transfert scp est introuvable."
        exit 1
    fi
    log_success "Outils locaux OK"
}

compress_assets() {
    if [ "$DEPLOY_MODE" = "full" ] || [ "$DEPLOY_MODE" = "front" ] || [ "$DEPLOY_MODE" = "backup" ]; then
        log_info "Compression du Frontend React (en excluant le dossier /server et les builds locaux)..."
        cd "$SCRIPT_DIR"
        rm -f "../$ARCHIVE_FRONT"
        7z a "../$ARCHIVE_FRONT" ./* -xr!'server' -xr!'node_modules' -xr!'.git' -xr!'dist' -xr!'build' -xr!'Docmaster_Backend' -xr!'Docmaster_Backend_V2' -xr!'*.7z' -xr!'mobile' >/dev/null
        log_success "Frontend (React) compressé avec succès !"
    fi

    if [ "$DEPLOY_MODE" = "full" ] || [ "$DEPLOY_MODE" = "backup" ]; then
        log_info "Compression du Backend (Dossier /server)..."
        # Copy production env file to server folder before compressing
        if [ -f "./server/.env.production" ]; then
            cp "./server/.env.production" "./server/.env"
            log_success "Fichier .env.production copié vers ./server/.env"
        else
            log_warning "Fichier ./server/.env.production introuvable, aucune copie effectuée."
        fi
        rm -f "../$ARCHIVE_BACK"
        if [ -d "./server" ]; then
            7z a "../$ARCHIVE_BACK" ./server/* -xr!'node_modules' -xr!'.git' -xr!'dist' >/dev/null
        else
            log_error "Le dossier ./server (Backend) n'existe pas à l'emplacement attendu."
            exit 1
        fi
        log_success "Backend compressé avec succès !"
    fi
}

transfer_assets() {
    log_info "Transfert des archives vers le dossier temporaire du VPS..."
    FILES_TO_TRANSFER=""
    if [ "$DEPLOY_MODE" = "full" ] || [ "$DEPLOY_MODE" = "front" ] || [ "$DEPLOY_MODE" = "backup" ]; then
        FILES_TO_TRANSFER="../$ARCHIVE_FRONT"
    fi
    if [ "$DEPLOY_MODE" = "full" ] || [ "$DEPLOY_MODE" = "backup" ]; then
        FILES_TO_TRANSFER="$FILES_TO_TRANSFER ../$ARCHIVE_BACK"
    fi
    
    scp -P "$REMOTE_PORT" $FILES_TO_TRANSFER "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/"
    if [ $? -ne 0 ]; then
        log_error "Échec du transfert SSH / SCP."
        exit 1
    fi
    log_success "Transfert réussi"
    
    # Nettoyage des fichiers d'archive locaux après envoi
    rm -f "../$ARCHIVE_FRONT" "../$ARCHIVE_BACK"
}

execute_remote_deployment() {
    log_info "Exécution du déploiement V2 sur le VPS..."
    
    ssh -p "$REMOTE_PORT" "$REMOTE_USER@$REMOTE_HOST" -t << REMOTE_SCRIPT
    set -e
    
    # 1. Préparation et nettoyage des dossiers applicatifs distants
    echo "Mise à jour des structures de répertoires..."
    mkdir -p "$FRONTEND_DIR"
    mkdir -p "$BACKEND_DIR"
    
    # Extraction sécurisée Frontend
    if [ -f "$REMOTE_PATH/$ARCHIVE_FRONT" ]; then
        echo "Extraction du Frontend V2..."
        7z x "$REMOTE_PATH/$ARCHIVE_FRONT" -o"$FRONTEND_DIR" -y >/dev/null
        rm -f "$REMOTE_PATH/$ARCHIVE_FRONT"
    fi
    
    # Extraction sécurisée Backend
    if [ -f "$REMOTE_PATH/$ARCHIVE_BACK" ]; then
        echo "Extraction du Backend V2..."
        7z x "$REMOTE_PATH/$ARCHIVE_BACK" -o"$BACKEND_DIR" -y >/dev/null
        rm -f "$REMOTE_PATH/$ARCHIVE_BACK"
    fi

    # 2. Gestion sélective du build et des dépendances selon le mode choisi
    if [ "$DEPLOY_MODE" = "full" ] || [ "$DEPLOY_MODE" = "front" ]; then
        echo "Mode $DEPLOY_MODE activé : Installation et Compilation..."
        
        if [ "$DEPLOY_MODE" = "full" ] || [ "$DEPLOY_MODE" = "front" ]; then
            # Traitement Frontend V2 (React)
            echo "→ Configuration Dépendances et Compilation (Build) du Frontend React..."
            cd "$FRONTEND_DIR"
            npm install --quiet
            npm run build
        fi
        
        if [ "$DEPLOY_MODE" = "full" ]; then
            # Traitement Backend V2
            echo "→ Configuration Dépendances et Build Backend..."
            cd "$BACKEND_DIR"
            npm install --quiet
            npm run build
            
            # Exécution optionnelle des migrations de base de données
            if [ "$MIGRATE" = true ]; then
                echo "→ Exécution des migrations de base de données (Knex/Prisma)..."
                npm run db:migrate || echo "⚠️ Attention : Échec de l'exécution du script de migration (db:migrate)."
            fi
        fi
        
        echo "✓ Composants configurés et compilés avec succès."
    fi
REMOTE_SCRIPT
}

post_deployment() {
    log_info "Phase finale : Redémarrage des nouveaux processus PM2 v2..."
    read -p "Voulez-vous redémarrer vos processus PM2 v2 maintenant ? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ssh -p "$REMOTE_PORT" "$REMOTE_USER@$REMOTE_HOST" << 'REMOTE_SCRIPT'
        
        # 1. Sécurité environnement & isolation des ports pour le Backend V2
        if [ ! -f "/var/www/vhosts/docmaster.net/app/Docmaster_Backend_V2/.env" ]; then
            echo "⚠️ Fichier .env absent pour l'API V2! Synchronisation depuis l'architecture V1..."
            if [ -f "/var/www/vhosts/docmaster.net/app/Docmaster_Backend_V1/.env" ]; then
                cp /var/www/vhosts/docmaster.net/app/Docmaster_Backend_V1/.env /var/www/vhosts/docmaster.net/app/Docmaster_Backend_V2/.env
                # Changement dynamique du port d'écoute à 5001 pour ne pas entrer en conflit avec la V1 (qui utilise le 5000)
                if grep -q "PORT=" "/var/www/vhosts/docmaster.net/app/Docmaster_Backend_V2/.env"; then
                    sed -i 's/PORT=5000/PORT=5001/g' /var/www/vhosts/docmaster.net/app/Docmaster_Backend_V2/.env
                else
                    echo "PORT=5001" >> /var/www/vhosts/docmaster.net/app/Docmaster_Backend_V2/.env
                fi
                echo "🟢 .env initialisé avec succès sur le port d'isolement 5001."
            else
                echo "🔴 Erreur critique : Aucun fichier .env de référence trouvé sur le serveur !"
            fi
        fi

        # 2. Relancement du Frontend V2
        echo "Relancement du Frontend (docmaster-web-v2)..."
        cd /var/www/vhosts/docmaster.net/app/Docmaster
        pm2 restart docmaster-web-v2 --update-env || pm2 start server.js --name "docmaster-web-v2"
        
        # 3. Relancement du Backend API V2 (seulement si full ou backup)
        if [ "$DEPLOY_MODE" = "full" ] || [ "$DEPLOY_MODE" = "backup" ]; then
            echo "Relancement du Backend API (DOCMASTER-API_V2)..."
            pm2 restart DOCMASTER-API_V2 --update-env || pm2 start dist/index.js --name "DOCMASTER-API_V2" --update-env
        fi
        
        # Sauvegarde de la liste PM2
        pm2 save
        echo -e "\033[0;32m✓ Processus PM2 V2 mis à jour et relancés proprement.\033[0m"
REMOTE_SCRIPT
    fi
}


switch_to_production() {
    log_info "Bascule du frontend Vite (dev) vers server.js (production avec dist/)..."
    ssh -p "$REMOTE_PORT" "$REMOTE_USER@$REMOTE_HOST" << 'REMOTE_SCRIPT'
        cd /var/www/vhosts/docmaster.net/app/Docmaster
        pm2 restart docmaster-web-v2 --update-env || pm2 start server.js --name "docmaster-web-v2"
        pm2 save
        echo "✓ Frontend basculé vers server.js (mode production)"
        pm2 show docmaster-web-v2
REMOTE_SCRIPT
    log_success "Bascule terminée avec succès !"
}

# --- Cycle principal d'exécution ---
if [ "$DEPLOY_MODE" = "prod" ]; then
    switch_to_production
else
    check_local_tools
    compress_assets
    transfer_assets
    execute_remote_deployment
    post_deployment
fi

log_success "DÉPLOIEMENT TERMINÉ AVEC SUCCÈS SUR LA NOUVELLE ARCHITECTURE V2 !"