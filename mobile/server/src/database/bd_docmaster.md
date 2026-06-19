# User

```json
{
  "id": "user_ruxel_01",
  "nom": "Djeutchou",
  "prenom": "Ruxel",
  "email": "ruxel@example.com",
  "telephone": "+2376xxxxxxxx",
  "mot_de_passe": "hash_secure_123",
  "pays": "Cameroun",
  "ville": "Yaoundé",
  "verifier": true,
  "code_invitation": "RUX-99",
  "parrain": "user_id_parent",
  "point": 150,
  "wallet": 5000,
  "date_naissance": "1995-05-15",
  "lieu_naissance": "Douala",
  "currency": "XAF",
  "photo_url": "uploads/profiles/ruxel-profile.jpg",
  "created_at": "2026-04-27T10:00:00Z",
  "updated_at": "2026-04-27T10:00:00Z"
}
```

# Docmaster(Declaration)

```json
{
  "id": "decl_001",
  "identifiant_doc_dm": "DOC_2604_1",
  "doc_type": "CNI",
  "owner_name": "NOM SUR LE DOC",
  "document_number": "2024123456",
  "declaration_type": "LOST", // ou FOUND
  "status": "AVAILABLE", // AVAILABLE, SEARCHING, MATCHED, RETURNED
  "reporter_id": "user_id_qui_declare",
  "ville": "Yaoundé",
  "region": "Centre",
  "pays": "Cameroun",
  "fingerprint": "a5f6e8d9c2b1a0f9e8d7c6b5a4f3e2d1",
  "telephone_contact": "+2376xxxxxxxx",
  "email_contact": "contact@example.com",
  "mode_contact": "APP_CHAT", // APP_CHAT, PHONE, EMAIL
  "found_location": {
    "city": "Bastos",
    "lat": 3.848,
    "long": 11.502
  },
  "etat_physique": "bon", // Abimé, bon, moyen
  "photo_recto": "url_photo_1",
  "photo_verso": "url_photo_2",
  "description": "Trouvé près de la boulangerie",
  "date_expiration": "2030-12-31",
  "date_naissance": "1995-05-15", // Spécifique Perte
  "date_perte": "2026-04-28", // Spécifique Perte
  "urgence_niveau": "Urgente", // Faible, Modérée, Urgente
  "recompense_montant": 5000,
  "payment_status": "PENDING",
  "transactions_id": "trans_abc_123",
  "deleted_at": null,
  "deleted_reason": null
}
```
# document

```json
{
  "id": "my_doc_001",
  "user_id": "user_ruxel_01",
  "type_doc": "CNI", 
  "numero_doc": "202400112233",
  "nom_sur_doc": "Ruxel Djeutchou",
  "date_expiration": "2030-05-20",
  "fingerprint": "a5f6e8d9c2b1a0f9e8d7c6b5a4f3e2d1", 
  "photos": {
    "recto": "url_cloud_recto",
    "verso": "url_cloud_verso"
  },
  "is_protected": true,
  "created_at": "2026-04-27T12:00:00Z"
}
```

# Mes Appareil
```json
{
  "id": "obj_999",
  "user_id": "user_ruxel_01",
  "category": "ELECTRONIC", // LAPTOP, PHONE, CAMERA, BIKE, etc.
  "brand": "Apple",
  "model": "MacBook Pro M2",
  "serial_number_imei": "SN-XYZ-123456",
  "color": "Space Grey",
  "purchase_date": "2025-10-15",
  "purchase_value": 1200000,
  "garantie end": "",
  "lieux d'achat": "",
  
  "currency": "XAF",
  "photos": [
    "url_facture",
    "url_objet_face",
    "url_numero_serie"
  ],
  "status": "SAFE", // SAFE, LOST, STOLEN
  "created_at": "2026-04-27T20:30:00Z"
}
```


# claim

```json
{
  "id": "claim_555",
  "doc_id": "decl_001",
  "owner_id": "user_id_proprio",
  "finder_id": "user_id_trouveur",
  "verificat_code": "458912", // Ton code à 6 chiffres
  "status": "PENDING", // PENDING, VALIDATED, FAILED
  "verificat_attempts": 0,
  "created_at": "2026-04-27T15:00:00Z"
}
```

# Match (Mise en relation automatique)

```json
{
  "id": "match_uuid_123",
  "lost_declaration_id": "decl_lost_001",
  "found_declaration_id": "decl_found_002",
  "score": 85, // 0-100
  "status": "PENDING", // PENDING, CONFIRMED, REJECTED
  "created_at": "2026-05-02T10:00:00Z"
}
```

# Deletion Request (Demande de suppression)

```json
{
  "id": "del_req_uuid_999",
  "declaration_id": "decl_001",
  "user_id": "user_ruxel_01",
  "reason_type": "DUPLICATE", // DUPLICATE, INCORRECT_DATA, NO_LONGER_NEEDED, PRIVACY, OTHER
  "reason": "J'ai fait deux fois la même déclaration par erreur.",
  "status": "PENDING", // PENDING, APPROVED, REJECTED, EXECUTED
  "admin_id": null,
  "admin_comment": null,
  "created_at": "2026-05-02T14:30:00Z",
  "reviewed_at": null
}
```

# Document Types (Configuration des types de documents)

```json
{
  "id": "doc_type_001",
  "nom": "Carte Nationale d'Identité",
  "code": "CNI",
  "description": "Carte d'identité officielle",
  "prix_retrouvaille": 5000,
  "finder_percent": 80, // % pour le trouveur
  "app_percent": 20,    // % pour l'app
  "delai_expiration_mois": 6,
  "icone": "id-card",
  "categorie": "IDENTITE",
  "is_active": true,
  "created_at": "2026-05-06T12:00:00Z"
}
```


# transaction

```json
{
  "id": "trans_abc_123",
  "user_id": "user_id_payeur",
  "amount": 2000,
  "currency": "XAF",
  "status": "SUCCESS",
  "payment_method": "MTN_MOMO",
  "transact_id_external": "REF-888-999",
  "type": "declarat_fee", // subscript, declarat_fee, finder_payout
  "metadata": {
    "doc_id": "decl_001",
    "fee_app": 1000,
    "finder_payout": 1000
  }
}
```

# Plan

```json
{
  "id": "premium_mo",
  "name": "Pack Gold",
  "price": 2500,
  "interval": "month",
  "features": ["Alertes SMS", "Badge Vérifié"],
  "isActive": true
}
```

# Referral Config

```json
{
  "id": "global_config",
  "point_per_signup": 50,
  "point_per_subscript": 200,
  "point_per_doc_found": 100,
  "exchanges": [
    { "id": "1_month", "label": "1 mois gratuit", "cost": 500, "durat": 30 }
  ]
}
```



# user_subscriptions (Abonnements actifs)

```json
{
  "id": "sub_active_01",
  "user_id": "user_ruxel_01",
  "plan_id": "premium_gold", // Lien vers la collection 'plans'
  "date_debut": "2026-04-27T10:00:00Z",
  "date_fin": "2026-05-27T10:00:00Z",
  "status": "ACTIVE", // ACTIVE, EXPIRED, PENDING
  "auto_renew": false,
  "avantages_restants": {
    "sms_alertes": -1, // -1 = illimité
    "boost_annonces": 3
  }
}
```

# referrals

```json
{
  "id": "ref_999",
  "parrain_id": "user_ruxel_01",
  "filleul_id": "user_nouveau_02",
  "date_inscription": "2026-04-27T18:00:00Z",
  "recompense_attribuee": true, // Si les points ont déjà été versés
  "points_gagnes": 50,
  "status": "VALIDATED" // PENDING (en attente de vérification du compte)
}
```



# notifications
```json
{
  "id": "notif_001",
  "userId": "user_ruxel_01", // Le destinataire
  "type": "CLAIM_RECEIVED", // MATCH_FOUND, CODE_VALIDATED, POINTS_EARNED,PAYMENT_SUCCESS
  "title": "Document trouvé !",
  "message": "Quelqu'un pense avoir retrouvé votre CNI. Vérifiez les détails.",
  "metadata": {
    "docId": "decl_001",
    "claimId": "claim_555",
    "actionUrl": "/dashboard/claims/555"
  },
  "isRead": false,
  "createdAt": "2026-04-27T20:45:00Z",
  "channels": {
    "push": true,
    "sms": false,
    "email": true
  }
}
```