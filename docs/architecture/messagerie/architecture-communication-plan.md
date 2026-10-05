# Plan de communication d'architecture — Messagerie Docmaster (v1)

Skill : `architecture-communicator` · Date : 2026-10-05 · État du modèle : **current-state en evidence, target-state pour la messagerie**

## 1. Audience et décision

| | |
|---|---|
| **Audience** | Ingénierie (dev backend Express/TS + dev frontend React). Pas de direction ni de produit dans cette livraison. |
| **Décision à prendre** | « Où la messagerie se branche-t-elle dans le pipeline perdu→trouvé→payé, et quelles interfaces exactes dois-je écrire ? » |
| **Contrainte** | Une sprint de cadrage. Le lecteur doit pouvoir ouvrir son IDE avec ces 3 vues sans relire tout le serveur. |
| **Question écartée** | Le ROI, la roadmap produit, la topologie de déploiement : hors périmètre de cette audience. |

## 2. Choix de profondeur (L0→L4)

Niveaux retenus : **L2 conteneurs, L3 composants, L4 symboles avec `file:ligne`.**
Niveaux masqués volontairement : L0 capacité métier, vue runtime/déploiement (VPS + pm2 `DOCMASTER-API_V2`), sécurité/rgpd détaillée.

Ce qui est masqué et pourquoi :
- Les 4 canaux de delivery existants (SMS, email, push FCM) ne sont pas dessinés : **décision utilisateur = in-app uniquement**, donc seul le canal Socket.IO intéresse le build.
- Les rôles AUTORITE et ADMIN ne sont pas modélisés comme participants : **décision utilisateur = seules paires client↔trouveur (particulier et partenaire)**. Le modèle de données reste polymorphe pour ne pas bloquer une extension future, mais aucune room autorité n'est prévue en v1.

## 3. Hiérarchie du message (dans l'ordre où le lecteur doit l'entendre)

1. **La messagerie n'est pas un nouveau système, c'est une goulotte.** Elle s'ouvre dans `activateRecovery()` (server/src/controllers/payment.controller.ts:325-422), au point exact où `claims.status` passe à `PAID`. Rien à inventer côté déclenchement — **mais la fonction a 6 points d'appel et 4 voies de paiement** (webhook, polling, rédemption de points, cron de réconciliation : E26/E27), donc l'appel d'ouverture va dans la fonction, jamais chez un appelant.
2. **Le produit avait déjà promis ce canal.** `declarations.mode_contact` vaut `'APP_CHAT'` par défaut (server/src/database/shema/05_documents.sql:34) et aucun code ne lit cette colonne : la messagerie solde cette promesse, ce n'est pas une nouveauté introduite ici.
3. **L'identité est polymorphe, et c'est le vrai risque.** Un trouveur peut être un `users.id` **ou** un `partenaires.id` (55_create_partenaire_standalone.sql:55-64, FK `reporter_id`/`finder_id` supprimées). Le Socket.IO de ce serveur clé une `Map<userId, socketIds[]>` **sans type d'acteur** (socket.service.ts:13). Toute la v1 doit copier le patron `destinataire_type/destinataire_id` déjà résolu pour les notifications (56_notification_destinataire.sql).
4. **Le socle temps réel existe, la abstraction « thread » n'existe pas.** Une seule room (`admin`, socket.service.ts:83-86), aucun handler client→serveur, aucune table `conversations`/`messages`. C'est le travail réel : 3 tables + rooms + 5 endpoints.
5. **Une porte de sécurité à ne pas court-circuiter.** Le `verification_code` de remise est généré au paiement (payment.controller.ts:349) ; la messagerie ne doit jamais devenir le canal qui le fuit ou qui remplace la validation de remise.

## 4. Vues sélectionnées (3, une question chacune)

| Vue | Fichier | Question | Niveau |
|---|---|---|---|
| V1 — Goulotte de déclenchement et cycle de vie | `Messagerie-Declenchement.lifecycle.dot` | À quel moment précis la conversation s'ouvre-t-elle, et sur quels états déjà garantis ? | L4 symboles + états |
| V2 — Conteneurs et composants | `Messagerie-Conteneurs.dsl` | Comment le module messaging est-il découpé, et avec qui il parle ? | L2/L3 interfaces |
| V3 — Envoi d'un message | `Messagerie-EnvoiMessage.mmd` | Que traverse un message, et où est refusé un non-participant ? | séquence |

Format choisi selon `diagram-output-formats.md` : DOT pour le cycle de vie (graphe dense, Canvas viewer DOT), Structurizr DSL pour conteneurs/composants (sémantique C4 et réutilisation du modèle), Mermaid uniquement pour la séquence courte et Markdown-native.

## 5. Hypothèses assumées (à valider, pas du fait acquis)

| # | Hypothèse | Statut |
|---|---|---|
| H1 | Conversation = une paire LOST/FOUND payée, clé sur `claim_id`. **Inferred** : aucune preuve d'un tel clé dans le code, c'est un choix de design. | à valider |
| H2 | Statuts de conversation `OPEN / CLOSED / ARCHIVED`. **Inferred** (aucune table n'existe). | à valider |
| H3 | Les coordonnées directes (téléphone, email) sont masquées dans le chat. **Unknown** : `mode_contact='APP_CHAT'` le suggère fortement, mais `declaration.service.ts:180-188` rend déjà des coordonnées selon le contexte. | **blocant pour le produit** |
| H4 | Le portail partenaire pourra maintenir une connexion Socket.IO. **Faible** : `src/services/socket.ts` n'est initialisé qu' dans le portail user et l'admin (Dashboard.tsx:107, NotificationDropdown.tsx:65, NotificationModal.tsx:27, AdminMatchingMonitor.tsx:148). | à prouver en spike |

## 6. Ce que ces vues ne disent pas

Elles ne garantissent pas que le paiement est l'unique moment possible d'ouverture : c'est la **décision prise** pour cette v1, pas une contrainte technique. Elles ne couvrent ni la modération, ni la rétention des messages (PII : rien dans le dépôt n'exprime de politique de rétention), ni la scalabilité multi-instance de Socket.IO (`userSockets` est en mémoire process, socket.service.ts:13 — aucune config Redis adapter trouvée dans `server/src`, donc une instance unique seulement).

## 7. Prochaine action permise par ces vues

Spike de 1 journée sur H4 (partenaire connecté au socket) + validation de H3 par le produit. Les deux conditionnent le modèle de données de V2, pas l'inverse.
