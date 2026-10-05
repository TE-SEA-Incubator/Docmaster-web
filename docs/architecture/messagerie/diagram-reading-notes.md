# Notes de lecture — 3 vues messagerie

Dossier : `docs/architecture/messagerie/` · Audience : **ingénierie** · Produit par `architecture-communicator` + formats `c4model`(Structurizr)/Graphviz DOT/Mermaid, le 2026-10-05.
Toujours lire `messagerie.evidence.md` **avec** la vue : une flèche sans ligne E# est une hypothèse.

## Ordre de lecture conseillé

| Étape | Fichier | Ce que tu en tires | Ce que la vue cache |
|---|---|---|---|
| 1 | `Messagerie-Declenchement.lifecycle.dot` | Le **seul** point d'ancrage : `activateRecovery()` (E1-E3). Le matching (E6-E7) n'ouvre rien. | Les tables internes, le détail des requêtes |
| 2 | `Messagerie-Conteneurs.dsl` (views `V2a`, `V2b`) | La frontière du module : **5 fichiers à créer**, `socket.service.ts` à étendre, 1 appel entrant depuis le contrôleur de paiement. Les 3 portails et leurs capacités socket inégales. | L'ordre temporel des appels |
| 3 | `Messagerie-EnvoiMessage.mmd` | Le trajet d'un message + les 2 gardes (membership, statut OPEN/payé) et les 2 points de refus | Le paging, les pièces jointes, la modération (hors v1) |

Rendu : `dot -Tsvg Messagerie-Declenchement.lifecycle.dot -o v1.svg` ; `structurizr-cli` ou le viewer DSL Qoder pour `.dsl` ; le `.mmd` s'inline tel quel dans un Markdown.

## Ce que ces vues disent d'une voix claire

1. **Il n'y a pas de conception de déclencheur à faire.** La goulotte existe déjà et fait exactement ce qu'il faut (E1-E5). Le travail est en aval : 3 tables (E21, migration **69** — E24), rooms, endpoints.
2. **Le piège n°1 du branchement : les 4 voies de paiement.** `activateRecovery()` a 6 points d'appel (E26) — webhook NoKash, polling, **rédemption de points** (paiement instantané, aucun Mobile Money), et un **cron de réconciliation** qui active des `recovery_fee` restés bloqués hors de toute session utilisateur. Instrumenter le callback de polling uniquement laisserait des documents payés **sans fil ouvert** (E27). L'appel `openConversationForClaim()` va donc **dans la fonction**, pas chez les appelants.
3. **Le vrai sujet technique est l'identité, pas le temps réel.** Socket.IO est en place (E17) mais sa map est indexée sur un `id` **sans type** (E14), alors que l'application a officiellement deux espaces d'ids pour les trouveurs (E10, E11). Le dépôt a déjà résolu ce problème pour les notifications avec `destinataire_type/destinataire_id` (E12) et avec le JOIN de référence (E13). **Copier, ne pas réinventer.**
4. **Une partie de l'UI est déjà livrée et vide.** `/messagerie` est routé et affiché mais ne consomme rien (E20, `conversations: any[] = []`). Le gabarit existe donc ; ses règles de style sont imposées par `AGENTS.md` (page fullscreen, pas de dégradé, icônes sans fond).
5. **Le chat solde une promesse ancienne.** `mode_contact='APP_CHAT'` est validé, inséré et imprimé dans le PDF, mais ne pilote aucun comportement (E9) — c'est la seule explication cohérente du libellé « Chat intégré / App Chat ».

## Caveats qui changent l'interprétation

- **H4 est une dette bloquante pour la paire client↔partenaire.** Rien ne prouve que le portail partenaire tienne une connexion socket : le handshake l'accepterait (E18) mais aucun client ne l'ouvre (E19). Si le spike échoue, la vue V3 ampute les étapes 1 et 9 et il faut un repli polling — donc un endpoint de rattrapage dès le départ, pas en rustine.
- **H5 (collision d'ids)** : si les rooms sont indexées sur l'id nu, un `partenaires.id` et un `users.id` peuvent se voir voler le fil. C'est le risque n°1 de cette feature, pas un détail.
- **V1 ne prétend pas que le paiement est le seul moment *possible*** : c'est l'arbitrage du 2026-10-05. Ouvrir au matching serait un autre graphe.
- **Multi-instance** : `userSockets` vit en mémoire process (E14, U3). Deux instances = rooms cloisonnées. Sans Redis adapter, la messagerie **impose** une instance unique ou un scale-out à configurer.

## Trou de couverture identifié pendant la production de ces vues

Le chemin **vault match** (`POST /api/vault-match/respond`, vault-match.controller.ts:32) crée une déclaration LOST en `mode_contact='APP_CHAT'` (l.88), passe les deux déclarations en `MATCHED` (l.93-94) et note un match à score 100 (l.97-103) — **sans claim ni paiement**, et avec `finderId = null` quand le trouveur est un partenaire (l.115-116). Sous la règle retenue (« conversation après paiement »), ce flux aboutit à un document *correspondu* dont les parties **ne peuvent pas se parler**. À faire trancher par le produit avant la migration 69 : soit un paiement implicite (gratuité vault), soit une ouverture de fil spécifique à cette origine.

## Questions à remonter (une réponse débloque le modèle de données)

| Q | Blocage |
|---|---|
| Q1 (H3) | Téléphone/email/URL filtrés dans le corps des messages ? → définit le `guard` de V1 et un middleware de scrubbing ou non |
| Q2 (H1) | Un trouveur qui rend 2 documents payés au même client = 1 fil ou 2 ? → définit la clé unique de `conversations` |
| Q3 (vault) | Le vault match ouvre-t-il un fil alors qu'aucun paiement n'a lieu ? |
| Q4 (U1/U2) | Rétention des messages et droit de suppression, absence ou présence de modération ? |
