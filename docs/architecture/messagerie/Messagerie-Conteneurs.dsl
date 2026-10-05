workspace "Docmaster — Messagerie v1 (vue ingénierie)" "Vues conteneurs + composants du module de messagerie. Produit par architecture-communicator le 2026-10-05. Preuves : messagerie.evidence.md. Périmètre décidé : ouverture après paiement confirmé, paires client↔trouveur (USER et PARTENAIRE), canaux in-app uniquement." {

  model {

    owner = person "Client / propriétaire" "Déclaration LOST payée via NoKash, portail /dashboard."
    finderUser = person "Trouveur particulier" "declaration.reporter_type = 'USER'"
    finderPartner = person "Partenaire trouveur" "declaration.reporter_type = 'PARTENAIRE', compte autonome (55_create_partenaire_standalone.sql)"

    docmaster = softwareSystem "Docmaster" "Détection et restitution de documents perdus" {

      webapp = container "Docmaster Web (portail user)" "React 19 + Vite 8 + socket.io-client" {
        messageriePage = component "pages/auth/Messagerie.tsx" "Coquille vide : conversations: any[] = [] (l.17). Route /messagerie déjà déclarée (App.tsx:122), entrées Sidebar.tsx:35 et Topbar.tsx:236." "React" <<UI>>
        socketClient = component "services/socket.ts" "Handshake auth:{token} depuis le cookie. init() appelé uniquement par Dashboard.tsx:107, NotificationDropdown.tsx:65, NotificationModal.tsx:27, AdminMatchingMonitor.tsx:148." "TypeScript" <<UI>>
        convoService = component "services/conversationsService.ts" "Service REST du fil : calqué sur services/notificationsService.ts, axios via services/api.ts." "TypeScript" <<nouveau>> <<UI>>
      }

      partnerapp = container "Portail partenaires" "src/pages/partenaires + context/PartenaireContext.tsx. N'initialise AUCUNE connexion socket à ce jour (hypothèse H4 à prouver)." {
        partnerInbox = component "Boîte de réception partenaire" "Aucune page de messagerie n'existe côté partenaire." "React" <<nouveau>> <<UI>>
      }

      api = container "Docmaster API" "Express 5.2, TypeScript ESM (tsx), pg sans ORM, swagger-jsdoc" {

        seamModule = component "controllers/payment.controller.ts" "activateRecovery() 325-422 : claims.status='PAID' (372-386), declarations.payment_status='PAID' + status='MATCHED' (388-397), notification PAYMENT_PENDING au trouveur (409-417). SEAM d'ouverture : 1 fonction, 6 points d'appel — webhook :78, polling :304, paiement en POINTS :287, initiateRecovery (declaration.service.ts:683→735), cron de réconciliation (payment-reconciliation.service.ts:97 et :165). INSTRUMENTER LA FONCTION, JAMAIS LES APPELANTS." "Express" <<existant>>
        payRecovery = component "routes/payment.routes.ts" "POST /pay-recovery (:49), POST /nokash/callback (:82), GET /check/:externalRef (:208)." "Express" <<existant>>
        reconcileCron = component "utils/cron.utils.ts → payment-reconciliation.service.ts" "reconcileStuckTransactions() planifiée (cron.utils.ts:37) : active les recovery_fee restés PENDING, donc peut ouvrir un fil hors session utilisateur." "node-cron" <<existant>>
        msgRoutes = component "routes/conversation.routes.ts" "GET /api/conversations · GET /api/conversations/:id/messages?before= · POST /api/conversations/:id/messages · PATCH /api/conversations/:id/read · POST /api/conversations/:id/close. Montage dans server/index.ts (motif des l.271-281)." "Express" <<nouveau>>
        msgService = component "services/messaging.service.ts" "openConversationForClaim(claimId) idempotent · assertParticipant(actor, conversationId) · appendMessage() · markRead()" "TypeScript" <<nouveau>>
        msgRepo = component "repositories/conversation.repository.ts" "SQL pg parametré, même patron que claim.repository.ts" "pg" <<nouveau>>
        actorMiddleware = component "middleware/resolve-actor.ts" "Unifie auth.middleware.ts:8-33 (cookie docmaster_token ou Bearer, role users.role) et partenaires/partenaires.middleware.ts:11-47 (role='PARTNER', id = partenaire.id) et renvoie {actor_type, actor_id}." "Express" <<nouveau>>
        socketCore = component "services/socket.service.ts" "Singleton. userSockets: Map<string, string[]> sans type d'acteur (l.13). Handshake vérifie JWT user puis AUTORITE_JWT_SECRET (l.55-75), role = decoded.role || decoded.type (l.70). Seul ADMIN rejoint une room (l.83-86) : aucune room de conversation, aucun handler client→serveur." "Socket.IO" <<existant>> <<à modifier>>
        notifyCore = component "services/notification.service.ts" "createNotification() 73-108 persiste puis délivre ; deliverNotification() 114-243. Le socket est le canal toujours actif (l.117-121), ciblé par destinataire_id." "Node" <<existant>>
        matchingCore = component "services/matching.service.ts" "handleHighConfidenceMatch() 500-549 passe les deux déclarations en MATCHED et notifie ; le commentaire l.518 acte que le claim n'existe qu'après paiement." "Node" <<existant>>

        msgRoutes -> msgService
        msgService -> msgRepo
        msgRoutes -> actorMiddleware
        payRecovery -> seamModule : "chemin Mobile Money / points"
        reconcileCron -> seamModule : "rattrapage hors session"
        seamModule -> msgService : "openConversationForClaim()"
        msgService -> socketCore : "MESSAGE_NEW vers la room conv-{id}"
        msgService -> notifyCore : "alerte + compteur"
        matchingCore -> seamModule : "produit la paire payée"
      }

      db = container "PostgreSQL (docmaster)" "pg · migrations server/src/database/shema/NN_*.sql suivies par _migrations (max actuel = 68, init.ts:31-55)" {
        claimTable = component "claims" "doc_id, owner_id, finder_id, verification_code, status PENDING|PAID|VALIDATED (06_assets_and_claims.sql:19-28 ; FK finder_id retirée par 55_create_partenaire_standalone.sql:66-70 car un partenaire peut le remplir)" "Table" <<existant>>
        declTable = component "declarations" "reporter_id + reporter_type USER|PARTENAIRE (55_*.sql:55), mode_contact défaut 'APP_CHAT' (05_documents.sql:34), payment_status PENDING|PAID (l.35)" "Table" <<existant>>
        matchTable = component "matches" "lost_declaration_id, found_declaration_id, score, status (16_matches_table.sql:2-10)" "Table" <<existant>>
        notifTable = component "notifications" "destinataire_type USER|PARTENAIRE|AUTORITE + destinataire_id (56_notification_destinataire.sql:5-18) — patron polymorphe à copier" "Table" <<existant>>
        msgTables = component "conversations · conversation_participants · messages" "Migrations 69-70 à créer. Clé candidate de fil : claim_id (hypothèse H1). Participants : (actor_type, actor_id) UNIQUE sur la conversation." "Table" <<nouveau>>
      }
    }

    nokash = softwareSystem "NoKash" "Mobile Money Cameroun. startNokashPaymentPolling() 433-457 (5 s, timeout 5 min) + POST /api/payment/nokash/callback (payment.routes.ts:82)."

    owner -> webapp "déclare, paie, discute"
    finderUser -> webapp "déclare FOUND, discute"
    finderPartner -> partnerapp "déclare FOUND, discute"
    webapp -> api "REST axios + Socket.IO (polling puis websocket)"
    partnerapp -> api "REST axios avec partenaireAuth — pas de socket"
    api -> db "SQL parametré"
    api -> nokash "initie puis vérifie le paiement"
  }

  views {

    container docmaster "V2a-Conteneurs" "Quels conteneurs la messagerie touche, et quelle interface manque côté partenaire." {
      orientation TopLeft
    }

    component api "V2b-Composants API" "Frontière exacte du module : 5 fichiers nouveaux, 1 fichier existant à étendre (socket.service.ts), 1 point d'appel (activateRecovery)." {
      orientation TopLeft
    }

    styles {
      element "UI" {
        shape Browser
        backgroundColor #E3F2FD
      }
      element "Table" {
        shape Table
        backgroundColor #F5F5F5
      }
      element "Socket.IO" {
        backgroundColor #FCE4EC
      }
      element "nouveau" {
        borderColor #2D5A42
        borderWidth 2
      }
      element "à modifier" {
        borderStyle Dashed
        borderColor #E65100
      }
      element "existant" {
        backgroundColor #FFFFFF
      }
      relationship {
        color #666666
        thickness 1
      }
    }
  }
}
