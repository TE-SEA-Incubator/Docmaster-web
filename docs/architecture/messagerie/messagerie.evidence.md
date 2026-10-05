# Evidence model — Messagerie Docmaster v1

Généré par `architecture-communicator` le 2026-10-05 à partir de `main` (commit a3ce596). Les 3 vues (`V1 .dot`, `V2 .dsl`, `V3 .mmd`) se lisent **uniquement** à travers ce tableau : si une ligne n'est pas ici, elle est hypothétique.

## A. Ce qui est prouvé (confiance **high**)

| # | Assertion | Preuve |
|---|---|---|
| E1 | Le point d'ouverture post-paiement existe : `activateRecovery(userId, docId, transactionId)` | server/src/controllers/payment.controller.ts:325 |
| E2 | Au succès, `claims.status='PAID'` + `verification_code` (UPDATE 377-380 / INSERT 382-385) | payment.controller.ts:349, 372-386 |
| E3 | `declarations.payment_status='PAID'` et `status='MATCHED'` pour la LOST ; la FOUND passe aussi en `MATCHED` | payment.controller.ts:388-397 |
| E4 | Le trouveur est informé du paiement (`PAYMENT_PENDING`) mais **mis en relation par aucun canal** | payment.controller.ts:409-417 |
| E5 | Le succès NoKash est détecté par polling serveur 5 s / timeout 5 min + webhook | payment.controller.ts:433-457 ; payment.routes.ts:82, 49 |
| E6 | Le claim n'est volontairement créé qu'après paiement | matching.service.ts:518 (commentaire), `handleHighConfidenceMatch()` 500-549 |
| E7 | Le matching ≥80 passe les deux déclarations en MATCHED et notifie les deux côtés | matching.service.ts:132-138, 500-549 ; notification.service.ts:336 |
| E8 | Seuil métier : ≥80 CONFIRMED, 50-79 PENDING + notif `MATCH_POTENTIAL` | matching.service.ts:161-179, 463 |
| E9 | `mode_contact` vaut `'APP_CHAT'` par défaut : la colonne est **validée, stockée et imprimée** mais **jamais lue par une logique** (aucune comparaison `mode_contact ===` dans `server/src`) | 05_documents.sql:34 ; 18_add_contact_fields.sql:10 ; dtos/declaration.dto.ts:111-112 ; repositories/declaration.repository.ts:42 ; modules/pdf/templates/declaration.ts:29 ; controllers/vault-match.controller.ts:88 |
| E10 | Le participant trouveur est **polymorphe** : `declarations.reporter_type IN ('USER','PARTENAIRE')`, FK `reporter_id` supprimée | 55_create_partenaire_standalone.sql:55, 63-70 |
| E11 | Idem pour `claims.finder_id` (rétro-migré vers `partenaires.id`, FK retirée) | 55_create_partenaire_standalone.sql:60-70 |
| E12 | Le patron polymorphe déjà résolu côté notification : `destinataire_type` + `destinataire_id` + index composite | 56_notification_destinataire.sql:5-18, 24-29 |
| E13 | JOIN de référence pour résoudre une identité : `LEFT JOIN partenaires p ON p.id = d.reporter_id AND d.reporter_type='PARTENAIRE'` | autorites.service.ts:346, 356, 367 ; declaration.service.ts:180-188 |
| E14 | Socket = singleton, `userSockets: Map<string, string[]>` **sans type d'acteur** | socket.service.ts:13, 89-91 |
| E15 | Handshake socket : JWT user puis fallback `AUTORITE_JWT_SECRET` ; role = `decoded.role \|\| decoded.type` | socket.service.ts:55-75 |
| E16 | Seule room existante = `'admin'` (jointe si role ADMIN) ; **aucun handler client→serveur** | socket.service.ts:83-86, 93-102 |
| E17 | Diffusion temps réel existante ciblée par identifiant : `sendToUser(id, 'NEW_NOTIFICATION', …)` | socket.service.ts:111-123 ; notification.service.ts:117-121 |
| E18 | Le token partenaire est signé avec le **même secret** que les users (`verifyToken`), `id = partenaire.id`, `role='PARTNER'` | config/jwt.ts:23 ; partenaires/partenaires.middleware.ts:31-43 |
| E19 | Côté client, `socketService.init()` n'est appelé que dans 4 fichiers, tous du portail user/admin | Dashboard.tsx:107 ; NotificationDropdown.tsx:65 ; NotificationModal.tsx:27 ; AdminMatchingMonitor.tsx:148 |
| E20 | L'UI `/messagerie` existe : route, sidebar, topbar, mais données codées à `[]` | App.tsx:40, 122 ; Sidebar.tsx:35 ; Topbar.tsx:236 ; Messagerie.tsx:17 |
| E21 | **Aucune** table conversation/message/thread dans le schéma (68 migrations, aucune occurrence) | server/src/database/shema/ (listing complet) |
| E22 | `chat.routes.ts` = assistant IA Groq, **pas** une messagerie inter-utilisateurs | server/src/routes/chat.routes.ts:1-68 ; services/groq.service.ts |
| E23 | Convention de branchement d'un module : `routes → controllers → services → repositories`, montage dans `server/index.ts` | index.ts:37-47, 271-281 ; déclaration des scripts `db:migrate` (server/package.json) |
| E24 | Migrations = fichiers `NN_*.sql` triés (localeCompare) et journalisées dans `_migrations` → le prochain numéro est **69** | server/src/database/init.ts:31-55 ; listing `shema/` (max 68_admin_referral_codes.sql) |
| E25 | Rôles effectifs : `users.role` (défaut 'USER', ADMIN via middleware), partenaires et autorités = comptes autonomes | 09_add_user_role.sql:1 ; auth.middleware.ts:35-43 ; 50_create_autorites.sql ; 55_*.sql |
| E26 | `activateRecovery()` est appelée par **6 sites / 4 mécanismes** : webhook NoKash (78), polling de `payRecovery` (304), **paiement en POINTS sans Mobile Money** (`isPoints`, 287), `initiateRecovery()` du service de déclaration (declaration.service.ts:683 → polling 735), cron de réconciliation (payment-reconciliation.service.ts:97 et 165, planifié par cron.utils.ts:37) | Les 6 sites listés par `grep -rn activateRecovery server/src` |
| E27 | Un paiement de frais de récupération peut donc être **instantané** (points) ou **tardif** (cron) : le fil doit s'ouvrir dans les deux cas | payment.controller.ts:287 ; payment-reconciliation.service.ts:97 |

## B. Ce qui est inféré (confiance **medium/low**) — à valider

| # | Hypothèse | Base | Risque si fausse |
|---|---|---|---|
| H1 | La conversation se clé sur `claim_id` (une paire LOST/FOUND payée = un fil) | `claims(doc_id, owner_id, finder_id)` 06_assets_and_claims.sql:19-28 | Un trouveur avec 2 documents payés pour le même client → 2 fils ou 1 fil ? Change l'index `participants` |
| H2 | Statuts `OPEN / CLOSED / ARCHIVED` | Aucun précédent dans le dépôt ; `matches.status` (16_*.sql:7) et `claims.status` inspirent seulement | Un statut en moins = pas de clôture de remise ; en trop = états morts |
| H3 | Le chat masque téléphone/email/URL | `mode_contact='APP_CHAT'` (E9) le suggère, mais declaration.service.ts:180-188 **rend déjà** des coordonnées selon le contexte | Décision produit bloquante : si échange libre, le paiement perd son sens (contournement des frais) |
| H4 | Le portail partenaire saura maintenir une connexion Socket.IO | E18 autorise techniquement un handshake partenaire ; E19 montre qu'aucun client ne le fait | Sans cela, la paire client↔partenaire n'est **pas** temps réel → repli polling, et la vue V3 est amputée |
| H5 | Les identifiants `users.id` et `partenaires.id` restent distinguables par le type seul | Deux UUID distincts par table (02_users.sql:2, 53_create_partenaires.sql:3) ; pas de collision observée | Si une room/Map est indexée sur l'`id` nu (E14), un partenaire et un user pourraient recevoir le fil de l'autre |

## C. Inconnus ouverts (confiance **unknown**)

| # | Question | Pourquoi le code ne répond pas |
|---|---|---|
| U1 | Rétention et suppression des messages (PII : nom, lieu de remise) | Aucune politique de rétention dans le dépôt (les seules durées citées concernent les tokens refresh) |
| U2 | Modération / signalement d'un message | Aucune table, aucun endpoint, aucun rôle modérateur |
| U3 | Multi-instance Socket.IO | `userSockets` est en mémoire process (E14) ; aucune config Redis adapter trouvée dans `server/src` → une seule instance, sinon les rooms sont par process |
| U4 | Comportement si le paiement est remboursé/annulé après ouverture du fil | `payment-reconciliation.service.ts` existe mais ne touche ni claim ni contact |

## D. Décisions de périmètre (traçabilité, pas du code)

Issue de l'arbitrage utilisateur du 2026-10-05 : **déclencheur = après paiement confirmé** (E1-E5) · **paires = client↔trouveur particulier et client↔partenaire** (H4/H5 à résoudre) · **audience = ingénierie** · **canaux = in-app uniquement**, donc SMS/email/FCM de `deliverNotification()` (notification.service.ts:131-169) restent hors du fil et servent seulement d'alerte « nouveau message ».
