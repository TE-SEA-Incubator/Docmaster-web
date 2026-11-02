# Récupération DocMaster — Guide d'intégration

Ce guide décrit le workflow actuel : un `FOUND` peut correspondre à plusieurs
`LOST`, mais un `LOST` ne peut avoir qu'un seul `FOUND` actif. Le propriétaire
confirme explicitement son document, puis paie la récupération. Le trouveur
voit une vue limitée des déclarations de perte associées.

## 1. Parcours utilisateur

1. Le matching crée un match `PENDING` ou `CONFIRMED` par `LOST`. Un même
   `FOUND` peut être associé à plusieurs `LOST`.
2. Le propriétaire ouvre `/correspondances?id=<LOST_ID>` et consulte son
   candidat (`GET /declarations/:id/matches`). Le trouveur ouvre
   `/correspondances?id=<FOUND_ID>` pour voir les `LOST` associés avec des
   données personnelles limitées.
3. Il confirme explicitement le bon document
   (`POST /declarations/:id/confirm-match`).
4. Il paie la récupération depuis la page de confirmation. Le frontend appelle
   `POST /payments/pay-recovery` avec `docId`, `matchId`, `paymentMethod` et
   éventuellement `phone`.
5. Le backend réserve le `FOUND` avant l'appel de paiement externe.
6. Après confirmation du paiement, `activateRecovery` crée le claim gagnant,
   clôt les autres `LOST` associés au `FOUND` et ouvre la conversation.
7. Le trouveur valide le code lors de la remise. Le claim passe à `VALIDATED`,
   la récompense est versée et le document est clôturé.

Le paiement direct sans confirmation est refusé, même lorsqu'il n'existe qu'un
seul candidat.

## 2. Endpoints

### Propriétaire

| Méthode | Route | Rôle |
| :--- | :--- | :--- |
| `GET` | `/declarations/:id/matches` | Liste des candidats `PENDING`/`CONFIRMED` |
| `POST` | `/declarations/:id/confirm-match` | Confirmation explicite (`{ matchId }`) |
| `POST` | `/payments/pay-recovery` | Paiement (`{ docId, matchId, paymentMethod, phone? }`) |
| `GET` | `/recovery/status/:docId?matchId=...` | Statut, code si payé |
| `POST` | `/recovery/validate` | Validation du code par le trouveur |

`/declarations/recover` reste disponible comme alias du paiement, avec les
mêmes règles de confirmation et de réservation.

### Administration

| Méthode | Route | Rôle |
| :--- | :--- | :--- |
| `GET` | `/admin/matching/diagnose` | Diagnostic en lecture seule du matching |

## 3. Garanties de concurrence

- Un seul `FOUND` actif par `LOST` (index unique partiel
  `uniq_active_match_per_lost`). Un `FOUND` peut avoir plusieurs `LOST`.
- Réservation obligatoire avant l'appel au prestataire de paiement.
- Index uniques partiels : une réservation active par `FOUND` et par `LOST`.
- Verrou advisory PostgreSQL sur le `FOUND` + `SELECT ... FOR UPDATE` pendant
  l'activation.
- Claim unique par `FOUND` payé/validé.
- Les candidats perdants passent à `REJECTED` et leurs propriétaires sont
  notifiés (`MATCH_CLOSED`).
- Les activations sont idempotentes : un callback répété retourne le claim
  existant sans créer de doublon.
- En cas d'échec après un paiement réussi, la transaction repasse en `PENDING`
  afin d'être reprise par la réconciliation ; un paiement par points est
  remboursé si l'activation n'a pas abouti.

## 4. Délais et reprise

- TTL de réservation : `RECOVERY_RESERVATION_TTL_MINUTES` (15 par défaut).
- Expiration des réservations : cron chaque minute.
- Réconciliation des transactions : reprend les transactions `SUCCESS` sans
  claim et les active avec les métadonnées `{ docId, matchId, foundId,
  reservationId }`.
- Les webhooks Nokash et le polling transmettent le même contexte.

## 5. Statuts utiles

- Match : `PENDING`, `CONFIRMED`, `REJECTED`.
- Claim : `PENDING`, `PAID`, `VALIDATED`, `FAILED`.
- Réservation : `RESERVED`, `PAID`, `COMPLETED`, `EXPIRED`, `CANCELLED`.
- Déclaration trouvée : `AVAILABLE`, `MATCHED`, `RESERVED`, `CLAIMED`,
  `RETURNED`, `CANCELLED`.

## 6. Points d'attention

- Ne jamais payer depuis une notification sans passer par la confirmation.
- Un propriétaire ne peut pas avoir deux `FOUND` actifs pour le même `LOST`.
- Le trouveur ne voit jamais les données personnelles complètes du
  propriétaire avant la validation de la remise.
- Un `FOUND` déjà réservé ou récupéré ne peut pas être confirmé par un autre
  propriétaire.
- Les notifications `MATCH_CONFIRMED` indiquent au trouveur le `matchId` et le
  `foundId` concernés.
