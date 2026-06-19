# 🗑️ Système de Suppression de Déclarations avec Approbation Admin

## Vue d'ensemble

Système complet permettant aux utilisateurs de demander la suppression de leurs déclarations avec un motif, et aux administrateurs d'examinere et approuver/rejeter ces demandes.

---

## 📊 Modèle de Données

### Table `deletion_requests`

```sql
┌─────────────────────────────────────────┐
│ deletion_requests                       │
├─────────────────────────────────────────┤
│ id (UUID PK)                            │
│ declaration_id (FK → declarations)      │
│ user_id (FK → users)                    │
│ reason (TEXT) - Motif détaillé          │
│ reason_type (enum) - Type de motif      │
│ status (enum) - PENDING/APPROVED/etc    │
│ admin_id (FK → users) - Qui a approuvé  │
│ admin_comment (TEXT) - Motif du rejet   │
│ created_at, reviewed_at, executed_at    │
└─────────────────────────────────────────┘
```

### Types de Motifs (`reason_type`)
- `DUPLICATE` - Déclaration en double
- `INCORRECT_DATA` - Données incorrectes
- `NO_LONGER_NEEDED` - N'est plus nécessaire
- `PRIVACY` - Raison de confidentialité
- `OTHER` - Autre raison

### Statuts (`status`)
1. `PENDING` - En attente d'examen admin
2. `APPROVED` - Approuvé, prêt à être supprimé
3. `REJECTED` - Rejeté avec commentaire
4. `EXECUTED` - Suppression effectuée

---

## 🔌 Endpoints API

### USER ENDPOINTS

#### 1️⃣ Créer une demande de suppression
```http
POST /api/deletion-requests/declarations/:declarationId/request-deletion
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Cette déclaration contient des données incorrectes",
  "reason_type": "INCORRECT_DATA"
}
```

**Réponse (201):**
```json
{
  "success": true,
  "message": "Demande de suppression créée. Un administrateur examinera votre demande.",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "declaration_id": "550e8400-e29b-41d4-a716-446655440001",
    "user_id": "550e8400-e29b-41d4-a716-446655440002",
    "reason": "Cette déclaration contient des données incorrectes",
    "reason_type": "INCORRECT_DATA",
    "status": "PENDING",
    "created_at": "2026-05-02T15:30:00Z",
    "admin_id": null,
    "admin_comment": null,
    "reviewed_at": null,
    "executed_at": null
  }
}
```

**Erreurs possibles:**
- `401` - Non authentifié
- `400` - Motif ou type manquant
- `404` - Déclaration introuvable
- `403` - N'appartient pas à l'utilisateur
- `409` - Demande déjà existante pour cette déclaration

---

#### 2️⃣ Voir mes demandes de suppression
```http
GET /api/deletion-requests/me
Authorization: Bearer <token>
```

**Réponse (200):**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "declaration_id": "550e8400-e29b-41d4-a716-446655440001",
      "user_id": "550e8400-e29b-41d4-a716-446655440002",
      "reason": "Déclaration en double",
      "reason_type": "DUPLICATE",
      "status": "PENDING",
      "created_at": "2026-05-02T15:30:00Z",
      ...
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "declaration_id": "550e8400-e29b-41d4-a716-446655440004",
      "user_id": "550e8400-e29b-41d4-a716-446655440002",
      "reason": "Raison de confidentialité",
      "reason_type": "PRIVACY",
      "status": "APPROVED",
      "admin_id": "550e8400-e29b-41d4-a716-446655440005",
      "admin_comment": "Approuvé",
      "reviewed_at": "2026-05-02T16:00:00Z",
      ...
    }
  ]
}
```

---

#### 3️⃣ Voir les détails d'une demande
```http
GET /api/deletion-requests/:requestId
Authorization: Bearer <token>
```

**Réponse (200):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "declaration_id": "550e8400-e29b-41d4-a716-446655440001",
    "user_id": "550e8400-e29b-41d4-a716-446655440002",
    "reason": "Données incorrectes",
    "reason_type": "INCORRECT_DATA",
    "status": "PENDING",
    "admin_id": null,
    "admin_comment": null,
    "created_at": "2026-05-02T15:30:00Z",
    "reviewed_at": null,
    "executed_at": null
  }
}
```

---

### ADMIN ENDPOINTS

#### 4️⃣ Voir toutes les demandes en attente (ADMIN)
```http
GET /api/deletion-requests/admin/pending
Authorization: Bearer <admin-token>
```

**Réponse (200):**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "declaration_id": "550e8400-e29b-41d4-a716-446655440001",
      "user_id": "550e8400-e29b-41d4-a716-446655440002",
      "reason": "Données incorrectes",
      "reason_type": "INCORRECT_DATA",
      "status": "PENDING",
      "doc_type": "cni",
      "owner_name": "Jean Dupont",
      "declaration_type": "LOST",
      "declared_at": "2026-04-28T10:00:00Z",
      "nom": "Dupont",
      "prenom": "Jean",
      "email": "jean@example.com",
      "created_at": "2026-05-02T15:30:00Z"
    }
    // ... autres demandes
  ]
}
```

---

#### 5️⃣ Approuver une demande de suppression (ADMIN)
```http
POST /api/deletion-requests/admin/:requestId/approve
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "admin_comment": "Données déjà correctement documentées ailleurs"
}
```

**Réponse (200):**
```json
{
  "success": true,
  "message": "Demande approuvée. La déclaration sera supprimée.",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "declaration_id": "550e8400-e29b-41d4-a716-446655440001",
    "user_id": "550e8400-e29b-41d4-a716-446655440002",
    "reason": "Données incorrectes",
    "reason_type": "INCORRECT_DATA",
    "status": "APPROVED",
    "admin_id": "550e8400-e29b-41d4-a716-446655440005",
    "admin_comment": "Données déjà correctement documentées ailleurs",
    "created_at": "2026-05-02T15:30:00Z",
    "reviewed_at": "2026-05-02T16:30:00Z",
    "executed_at": "2026-05-02T16:30:00Z"
  }
}
```

---

#### 6️⃣ Rejeter une demande de suppression (ADMIN)
```http
POST /api/deletion-requests/admin/:requestId/reject
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "admin_comment": "Cette déclaration est importante pour l'historique. Veuillez contacter support@docmaster.com"
}
```

**Réponse (200):**
```json
{
  "success": true,
  "message": "Demande rejetée. L'utilisateur a été notifié.",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "declaration_id": "550e8400-e29b-41d4-a716-446655440001",
    "user_id": "550e8400-e29b-41d4-a716-446655440002",
    "reason": "Données incorrectes",
    "reason_type": "INCORRECT_DATA",
    "status": "REJECTED",
    "admin_id": "550e8400-e29b-41d4-a716-446655440005",
    "admin_comment": "Cette déclaration est importante pour l'historique...",
    "created_at": "2026-05-02T15:30:00Z",
    "reviewed_at": "2026-05-02T16:30:00Z",
    "executed_at": null
  }
}
```

---

## 📋 Flux utilisateur complet

```
┌─────────────────────────────────────────────────┐
│ 1. USER crée une demande de suppression         │
│    POST /api/deletion-requests/declarations/:id │
│    {reason, reason_type}                        │
│                                                 │
│    Status: PENDING                              │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│ 2. ADMIN examine les demandes en attente        │
│    GET /api/deletion-requests/admin/pending     │
│                                                 │
│    Voit: Motif, Type, Déclaration liée, User   │
└──────────────────────┬──────────────────────────┘
                       │
          ┌────────────┴────────────┐
          │                         │
          ▼                         ▼
    ┌──────────────┐          ┌──────────────┐
    │   APPROUVE   │          │   REJETTE    │
    │              │          │              │
    │ POST .../    │          │ POST .../    │
    │ approve      │          │ reject       │
    │              │          │              │
    └──────────────┘          └──────────────┘
          │                         │
          ▼                         ▼
    Status: APPROVED           Status: REJECTED
    ✅ Déclaration soft-delete  ❌ Notifier user
       (deleted_at = now)          (envoyé commentaire)
       deleted_reason = ...        user peut récupérer
```

---

## 🔐 Permissions

| Endpoint | Nécessite Auth | Nécessite Admin | Règle spéciale |
|----------|--|--|--|
| `POST /declaration/:id/request-deletion` | ✅ | ❌ | User propriétaire seulement |
| `GET /me` | ✅ | ❌ | Voir ses propres demandes |
| `GET /:id` | ✅ | ❌ | Voir sa demande OU admin |
| `GET /admin/pending` | ✅ | ✅ | Admin uniquement |
| `POST /admin/:id/approve` | ✅ | ✅ | Admin uniquement |
| `POST /admin/:id/reject` | ✅ | ✅ | Admin uniquement |

---

## 📧 Notifications (À implémenter)

Lorsqu'un admin approuve/rejette, l'utilisateur devrait être notifié via:
- 📧 Email
- 🔔 Notification in-app
- 💬 Message avec le commentaire de l'admin

---

## 💾 SQL Schema

```sql
-- Données sensibles supprimées (soft delete)
ALTER TABLE declarations ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE declarations ADD COLUMN deleted_reason TEXT;

-- Index pour requêtes rapides
CREATE INDEX idx_declarations_active 
ON declarations(deleted_at) WHERE deleted_at IS NULL;

-- Table de suivi des demandes
CREATE TABLE deletion_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  declaration_id UUID REFERENCES declarations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  reason_type VARCHAR(50),
  status VARCHAR(20) DEFAULT 'PENDING',
  admin_id UUID REFERENCES users(id),
  admin_comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP,
  executed_at TIMESTAMP
);
```

---

## 🧪 Exemples cURL

### Créer une demande
```bash
curl -X POST http://localhost:3000/api/deletion-requests/declarations/550e8400-e29b-41d4-a716-446655440001/request-deletion \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Données incorrectes dans le document",
    "reason_type": "INCORRECT_DATA"
  }'
```

### Voir mes demandes
```bash
curl http://localhost:3000/api/deletion-requests/me \
  -H "Authorization: Bearer <token>"
```

### Admin: Voir les demandes en attente
```bash
curl http://localhost:3000/api/deletion-requests/admin/pending \
  -H "Authorization: Bearer <admin-token>"
```

### Admin: Approuver
```bash
curl -X POST http://localhost:3000/api/deletion-requests/admin/550e8400-e29b-41d4-a716-446655440000/approve \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"admin_comment": "Approuvé - données redondantes"}'
```

### Admin: Rejeter
```bash
curl -X POST http://localhost:3000/api/deletion-requests/admin/550e8400-e29b-41d4-a716-446655440000/reject \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"admin_comment": "Cette déclaration est importante pour votre historique"}'
```

---

## ⚙️ Configuration Backend

### Fichiers modifiés:
1. ✅ `src/database/shema/19_create_deletion_requests.sql` - Schéma DB
2. ✅ `src/types/database.ts` - Types TypeScript
3. ✅ `src/repositories/deletion-request.repository.ts` - Accès DB
4. ✅ `src/controllers/deletion-request.controller.ts` - Logique métier
5. ✅ `src/routes/deletion-request.routes.ts` - Endpoints
6. ✅ `index.ts` - Intégration au serveur

### Prochaines étapes:
- [ ] Ajouter les notifications email/in-app
- [ ] Ajouter soft-delete effectif (UPDATE declarations SET deleted_at = ...)
- [ ] Ajouter audit log pour les suppressions admin
- [ ] Ajouter rate limiting sur création de demandes
- [ ] Frontend: formulaire de demande de suppression
