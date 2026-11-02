# Matching multi-candidats

Le matching relie les déclarations `LOST` et `FOUND` selon cette règle :

- un `FOUND` peut correspondre à **plusieurs** déclarations `LOST` ;
- une déclaration `LOST` ne peut avoir qu'**un seul** `FOUND` actif.

Si un meilleur `FOUND` apparaît pour un `LOST`, l'ancien match est rejeté
(`closed_reason = 'SUPERSEDED'`) et remplacé. Un match déjà confirmé par le
propriétaire n'est jamais remplacé. Le premier paiement confirmé réserve le
`FOUND`, crée le claim gagnant et clôt les autres candidats.

## Cycle de vie

1. Une déclaration `LOST` (`SEARCHING`) ou `FOUND` (`AVAILABLE`) est créée.
2. Le matching calcule un score pour chaque paire active.
3. Le score détermine le statut de la correspondance :
   - `>= 80` : `CONFIRMED`
   - `50 – 79` : `PENDING`
   - `< 50` : ignorée
4. Le propriétaire doit confirmer explicitement un candidat
   (`POST /declarations/:id/confirm-match`) avant tout paiement.
5. Le paiement réserve le `FOUND` puis active la récupération. Les autres
   matches sont fermés avec `closed_reason = 'ALREADY_CLAIMED'`.

Un match `CONFIRMED` n'est jamais rétrogradé par le cron. Les scores des
matches `PENDING` sont rafraîchis et peuvent être promus à `CONFIRMED`.

## Scoring

| Facteur | Barème |
| :--- | :--- |
| Empreinte identique | 100 (retour immédiat) |
| Numéro de document | 50 |
| Nom du propriétaire | 40 / 20 selon similarité |
| Ville | 20 |
| Quartier | 10 |
| Date | 15 / 10 / 5 selon proximité |
| État physique | 5 |
| Type de document | 10 |

Le score total est plafonné à 100.

## Statuts

- `PENDING` : candidat potentiel, visible par le propriétaire.
- `CONFIRMED` : score de correspondance élevé (`>= 80`). Le propriétaire doit
  encore confirmer explicitement (`owner_confirmed_at`) avant le paiement.
- `REJECTED` : candidat fermé (`closed_reason`) après un gagnant, un rejet ou
  le remplacement par un meilleur `FOUND`.
- `MATCHED` (déclaration) : au moins un candidat actif ou récupération payée.
- `RESERVED`, `CLAIMED`, `RETURNED`, `CANCELLED` : états de récupération du
  document trouvé.

## Exécution

- Matching automatique : 3 fois par jour, toutes les 8 heures (`0 */8 * * *`).
- Diagnostic admin : `GET /admin/matching/diagnose?declarationId=...&limit=...`.
- API propriétaire : `GET /declarations/:id/matches`.

Le diagnostic est en lecture seule et ne modifie ni les scores ni les statuts.

## Contrainte base de données

La migration `74_one_found_per_lost.sql` nettoie les doublons historiques puis
crée l'index unique partiel `uniq_active_match_per_lost` sur
`matches(lost_declaration_id)` pour les statuts `PENDING` et `CONFIRMED`.

## Réservations

La table `recovery_reservations` garantit une seule réservation active par
`FOUND` et par `LOST`. Les réservations non payées expirent après
`RECOVERY_RESERVATION_TTL_MINUTES` (15 minutes par défaut). Le cron d'expiration
s'exécute chaque minute. Un verrou advisory PostgreSQL sur le `FOUND`, combiné
à `FOR UPDATE`, sérialise les activations concurrentes.
