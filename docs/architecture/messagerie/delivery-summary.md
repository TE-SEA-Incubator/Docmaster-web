# Résumé de livraison — Messagerie v1 (vues d'architecture pour l'ingénierie)

**À qui** : l'équipe qui va implémenter (1 backend Express/TS, 1 frontend React). Ni direction, ni produit, ni ops.
**Quoi** : 3 vues + modèle d'évidence, pour répondre à une seule question : *où brancher la messagerie et quelles interfaces écrire ?*
**Dossier** : `docs/architecture/messagerie/`

| Fichier | Rôle |
|---|---|
| `architecture-communication-plan.md` | Audience, profondeur retenue (L2→L4), ce qui est masqué et pourquoi, hypothèses |
| `Messagerie-Declenchement.lifecycle.dot` | **V1** — goulotte de déclenchement et cycle de vie (Graphviz, `rankdir=TB`) |
| `Messagerie-Conteneurs.dsl` | **V2** — conteneurs + composants, vues `V2a-Conteneurs` et `V2b-Composants API` (Structurizr DSL) |
| `Messagerie-EnvoiMessage.mmd` | **V3** — trajet d'un message et points de refus (Mermaid sequence) |
| `messagerie.evidence.md` | 27 assertions prouvées `file:ligne` (E1-E27), 5 hypothèses (H1-H5), 4 inconnus (U1-U4) |
| `diagram-reading-notes.md` | Ordre de lecture, caveats, trou de couverture du vault match, 4 questions à trancher |
| `delivery-summary.md` | ce fichier |

## Le message que l'ingénierie doit retenir

1. Le déclencheur est **déjà écrit** : `activateRecovery()` (server/src/controllers/payment.controller.ts:325-422) pose `claims.status='PAID'` et `declarations.payment_status='PAID'`. Il faut un appel idempotent `messagingService.openConversationForClaim(claimId)` **à l'intérieur de cette fonction**, près de la notification `PAYMENT_PENDING` (l.409-417). **Le piège : elle a 6 points d'appel et 4 voies de paiement** — webhook NoKash, polling, **rédemption de points** (instantanée, sans Mobile Money, l.287), et cron de réconciliation des transactions bloquées (`payment-reconciliation.service.ts:97,165` via `cron.utils.ts:37`). Brancher un callback de paiement seulement = des documents payés sans fil ouvert (E26, E27). **Aucune nouvelle logique de paiement n'est requise.**
2. Le temps réel est **déjà là**, l'abstraction « fil » ne l'est pas : 1 seule room (`admin`, socket.service.ts:83-86), 0 handler client→serveur, 0 table. À créer : `conversations`, `conversation_participants`, `messages` en migrations **69-70** (max actuel 68, `init.ts` trie et journalise dans `_migrations`).
3. La difficulté réelle est **l'identité polymorphe** : un trouveur est un `users.id` **ou** un `partenaires.id` (`declarations.reporter_type`, 55_create_partenaire_standalone.sql:55). La map socket actuelle n'a pas de dimension de type (socket.service.ts:13). Le dépôt possède déjà le patron à copier (`destinataire_type`/`destinataire_id`, 56_notification_destinataire.sql:5-18) et le JOIN de référence (autorites.service.ts:346).
4. Le frontend a **déjà sa page** : `/messagerie` routé (App.tsx:122, Sidebar.tsx:35) avec `conversations = []` codé en dur (Messagerie.tsx:17) ; le style est imposé par `AGENTS.md` (page fullscreen, pas de dégradé, icônes sans fond).

## Comment utiliser ces artefacts

- **Sprint de cadrage** : ouvrir V2b pour lister les fichiers du ticket, V3 pour écrire les tests d'autorisation (`NOT_PARTICIPANT`, fil fermé), V1 pour positionner l'appel dans le contrôleur de paiement.
- **Avant toute migration** : faire répondre Q1-Q3 de `diagram-reading-notes.md`. H1 (clé du fil) et H3 (masquage des coordonnées) changent le `UNIQUE` et ajoutent ou suppriment un middleware de scrubbing.
- **Spike obligatoire (½ jour)** : H4 — faire tenir une connexion Socket.IO au portail partenaire. Sans preuve, la paire client↔partenaire retombe en polling et le contrat de V3 change.

## Limites à ne pas oublier

Ces vues décrivent le **current-state prouvé** et un **target-state déclaré** : rien de ce qui est en pointillé n'existe dans le dépôt. Le trou du **vault match** (fil jamais ouvert bien que `MATCHED` et `APP_CHAT`, vault-match.controller.ts:88-103) est une conséquence directe de l'arbitrage « après paiement » : assumé, mais à valider. La messagerie suppose aussi une **instance API unique** tant que `userSockets` reste en mémoire (U3).

## Maintenance

Toute nouvelle goulotte d'ouverture (matching, transfert d'appareil `device-transfer.routes.ts`, autorité) impose : ajouter une ligne E# à `messagerie.evidence.md`, puis redessiner V1. Les IDs de nœuds (`seam`, `openconv`, `socketCore`…) sont stables volontairement pour diff.
