# ==============================================================================
# MAKEFILE DE COMMANDES RAPIDES - DOCMASTER V2
# ==============================================================================

VPS_IP=217.154.126.24
BACKEND_NAME=DOCMASTER-API_V2
FRONTEND_NAME=docmaster-web-v2

# Couleurs pour le terminal local
GREEN=\033[0;32m
YELLOW=\033[0;33m
NC=\033[0m

.PHONY: deploy deploy-full deploy-front health restart stop start logs help prod
.PHONY: deploy-migrate deploy-backup-migrate

help:
	@echo "Commandes disponibles :"
	@echo ""
	@echo "DÉPLOIEMENT V2:"
	@echo "  make deploy      - Sépare, envoie et extrait le Front et le Back (simple)"
	@echo "  make deploy-full - Déploiement complet (Envoi + Installation + Compilations + PM2)"
	@echo "  make deploy-front - Déploiement uniquement du frontend"
	@echo "  make deploy-migrate - Déploiement complet et exécution des migrations distantes"
	@echo "  make deploy-backup-migrate - Backup/extraction + exécution des migrations distantes"
	@echo "  make prod          - Bascule le frontend Vite (dev) vers server.js (production avec dist/)"
	@echo ""
	@echo "GESTION DES SERVICES V2:"
	@echo "  make restart     - Redémarre proprement les processus PM2 V2"
	@echo "  make stop        - Stoppe les instances applicatives V2 sur le VPS"
	@echo "  make start       - Démarre les instances applicatives V2"
	@echo "  make logs        - Affiche les logs PM2 du serveur"

deploy:
	@bash deploy.sh backup

deploy-full:
	@bash deploy.sh full

deploy-front:
	@bash deploy.sh front

deploy-migrate:
	@bash deploy.sh full -m

deploy-backup-migrate:
	@bash deploy.sh backup -m

prod:
	@bash deploy.sh prod

restart:
	@echo "$(YELLOW)Redémarrage des services PM2 V2 sur le VPS...$(NC)"
	@ssh root@$(VPS_IP) "pm2 restart $(BACKEND_NAME) && pm2 restart $(FRONTEND_NAME) --update-env && pm2 save"
	@echo "$(GREEN)✓ Services V2 redémarrés !$(NC)"

stop:
	@echo "$(YELLOW)Arrêt des applications V2...$(NC)"
	@ssh root@$(VPS_IP) "pm2 stop $(BACKEND_NAME) && pm2 stop $(FRONTEND_NAME)"
	@echo "$(GREEN)✓ Services V2 stoppés$(NC)"

start:
	@echo "$(YELLOW)Démarrage des processus V2...$(NC)"
	@ssh root@$(VPS_IP) "pm2 start $(BACKEND_NAME) && pm2 start $(FRONTEND_NAME)"
	@echo "$(GREEN)✓ Services V2 démarrés$(NC)"

logs:
	@ssh root@$(VPS_IP) "pm2 logs"