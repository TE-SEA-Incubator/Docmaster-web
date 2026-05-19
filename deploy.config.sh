#!/bin/bash

# ==============================================================================
# CONFIGURATION DE DÉPLOIEMENT AUTOMATIQUE - DOCMASTER (V2)
# ==============================================================================

# --- Connexion SSH ---
REMOTE_HOST="217.154.126.24"
REMOTE_USER="root"
REMOTE_PORT="22"

# --- Chemins Exacts des Projets sur le Serveur ---
REMOTE_PATH="/root"
FRONTEND_DIR="/var/www/vhosts/docmaster.net/app/Docmaster"
BACKEND_DIR="/var/www/vhosts/docmaster.net/app/Docmaster_Backend_V2"

# --- Noms des Archives Temporaires ---
ARCHIVE_FRONT="Docmaster_Frontend.7z"
ARCHIVE_BACK="Docmaster_Backend.7z"

# --- Processus PM2 Réels V2 ---
SERVICES=("docmaster-web-v2" "DOCMASTER-API_V2")

# --- Couleurs pour la Console ---
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Fonctions d'affichage globales
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓ SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[✗ ERROR]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[!]${NC} $1"; }