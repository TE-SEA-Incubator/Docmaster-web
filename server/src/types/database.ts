/**
 * DocMaster Type Definitions
 */

export interface User {
    id: string;
    nom: string;
    prenom: string;
    email: string;
    telephone?: string;
    mot_de_passe: string;
    pays: string;
    ville: string;
    is_verified: boolean;
    code_invitation?: string;
    parrain_id?: string;
    points: number;
    wallet_balance: number;
    date_naissance?: Date;
    lieu_naissance?: string;
    genre?: 'HOMME' | 'FEMME' | 'AUTRE' | string;
    photo_url?: string;
    currency: string;
    role: 'USER' | 'ADMIN' | 'PARTNER';
    created_at: Date;
    updated_at: Date;
}

export type DeclarationType = 'LOST' | 'FOUND';
export type DocumentStatus =
    | 'AVAILABLE'
    | 'SEARCHING'
    | 'MATCHED'
    | 'RESERVED'
    | 'CLAIMED'
    | 'RETURNED'
    | 'CANCELLED';

export interface DocumentType {
    id: string;
    nom: string;
    code: string;
    description?: string;
    prix_retrouvaille: number;
    finder_percent: number;
    app_percent: number;
    points_recompense: number;
    delai_expiration_mois: number;
    icone?: string;
    categorie?: string;
    is_active: boolean;
    fields?: any;
    color?: string;
    bg?: string;
    created_at: Date;
    updated_at?: Date;
}

export interface DocumentDeclaration {
    id: string;
    identifiant_doc_dm: string;
    doc_type: string;
    owner_name: string;
    document_number: string;
    declaration_type: DeclarationType;
    status: DocumentStatus;
    reporter_id: string;
    client_request_id?: string | null;
    reporter_type?: 'USER' | 'PARTENAIRE';
    ville: string;
    region: string;
    pays: string;
    fingerprint: string;
    found_location?: {
        city: string;
        lat: number;
        long: number;
    };
    etat_physique: string;
    photo_recto?: string;
    photo_verso?: string;
    description?: string;
    date_expiration?: string;
    mode_contact: string;
    payment_status: 'PENDING' | 'PAID';
    transactions_id?: string;
    date_naissance?: string;
    urgence_niveau?: string;
    recompense_montant?: number;
    date_perte?: string;
    telephone_contact?: string;
    email_contact?: string;
    quartier?: string;
    metadata?: any;
    department?: string;
    arrondissement?: string;
    created_at: Date;
    deleted_at?: Date | null;
    deleted_reason?: string | null;
}

export type MatchStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED';

export interface Match {
    id: string;
    lost_declaration_id: string;
    found_declaration_id: string;
    score: number;
    status: MatchStatus;
    details?: any;
    owner_confirmed_at?: Date | null;
    owner_confirmed_by?: string | null;
    closed_reason?: string | null;
    closed_at?: Date | null;
    created_at: Date;
    updated_at?: Date;
}

export type RecoveryReservationStatus = 'RESERVED' | 'PAID' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';

export interface RecoveryReservation {
    id: string;
    match_id: string | null;
    lost_declaration_id: string;
    found_declaration_id: string;
    owner_id: string | null;
    transaction_id: string | null;
    status: RecoveryReservationStatus;
    expires_at: Date;
    created_at: Date;
    updated_at: Date;
}


export interface UserDocument {
    id: string;
    user_id: string;
    type_doc: string;
    numero_doc: string;
    nom_sur_doc: string;
    date_expiration?: Date;
    date_delivrance?: Date;
    nom_autorite?: string;
    notes?: string;
    fingerprint: string;
    photo_recto?: string;
    photo_verso?: string;
    is_protected: boolean;
    is_lost: boolean;
    declaration_id?: string;
    validity_option: 'EXPIRING' | 'PERMANENT';
    is_archived: boolean;
    archived_at?: Date;
    expiration_reminded: boolean;
    expiration_reminded_at?: Date;
    created_at: Date;
}

export interface Claim {
    id: string;
    doc_id: string;
    found_declaration_id?: string | null;
    owner_id: string;
    finder_id: string;
    verification_code: string;
    status: 'PENDING' | 'PAID' | 'VALIDATED' | 'FAILED';
    verification_attempts: number;
    attempts: number;
    amount?: number | null;
    currency?: string;
    transaction_id?: string | null;
    created_at: Date;
}

export interface Transaction {
    id: string;
    user_id: string;
    amount: number;
    currency: string;
    status: 'PENDING' | 'SUCCESS' | 'FAILED';
    payment_method: string;
    transact_id_external?: string;
    external_ref?: string;
    type: 'subscription' | 'declarat_fee' | 'finder_payout' | 'recovery_fee';
    metadata?: any;
    created_at: Date;
}

export interface PasswordResetToken {
    id: string;
    user_id: string;
    token: string;
    expires_at: Date;
    used: boolean;
    used_at?: Date;
    created_at: Date;
}

export type DeletionReasonType = 'DUPLICATE' | 'INCORRECT_DATA' | 'NO_LONGER_NEEDED' | 'PRIVACY' | 'OTHER';
export type DeletionRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXECUTED';

export interface DeletionRequest {
    id: string;
    declaration_id: string;
    user_id: string;
    reason: string;
    reason_type: DeletionReasonType;
    status: DeletionRequestStatus;
    admin_id?: string;
    admin_comment?: string;
    created_at: Date;
    reviewed_at?: Date;
    executed_at?: Date;
}

export type ReportTargetType = 'DECLARATION' | 'MATCH' | 'CONVERSATION' | 'USER' | 'SUPPORT';
export type ReportReasonCategory = 'WRONG_DOCUMENT' | 'NO_HANDOVER' | 'FRAUD' | 'ABUSIVE' | 'OTHER';
export type ReportStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'DISMISSED';

export type ReportActionType =
    | 'REPLY'
    | 'NUDGE_FINDER'
    | 'REGENERATE_CODE'
    | 'CLOSE_AND_REFUND'
    | 'BLOCK_USER'
    | 'UNBLOCK_USER';

/** Compte sanctionné par BLOCK_USER / UNBLOCK_USER : la cible du ticket ou son auteur. */
export type ReportActionSubject = 'TARGET' | 'REPORTER';

export interface Report {
    id: string;
    reporter_id: string;
    target_type: ReportTargetType;
    target_id: string | null;
    reason_category: ReportReasonCategory;
    description: string;
    status: ReportStatus;
    admin_note?: string | null;
    admin_reply?: string | null;
    resolution_action?: ReportActionType | null;
    resolution_payload?: Record<string, any> | null;
    /** Dossier de récupération rattaché à une demande d'aide sans cible. */
    context_match_id?: string | null;
    resolved_by?: string | null;
    resolved_at?: Date | null;
    created_at: Date;
    updated_at: Date;
}

export type WithdrawalRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID' | 'CANCELLED';

export interface WithdrawalRequest {
    id: string;
    user_id: string;
    amount: number;
    currency: string;
    payment_method: string;
    payment_details: string; // ex: numéro orange money, compte bancaire, etc.
    status: WithdrawalRequestStatus;
    admin_id?: string;
    admin_comment?: string;
    transaction_id?: string; // id de la transaction de débit associée
    created_at: Date;
    updated_at: Date;
    processed_at?: Date;
}

export type AutoriteNiveau = 'HAUTE' | 'NORMAL';

export interface Autorite {
    id: string;
    nom: string;
    prenom: string;
    email: string;
    telephone?: string;
    mot_de_passe: string;
    niveau: AutoriteNiveau;
    ville: string;
    region?: string;
    department?: string;
    arrondissement?: string;
    bureau?: string;
    is_active: boolean;
    must_change_password: boolean;
    created_by?: string | null;
    created_at: Date;
    updated_at: Date;
}

export interface AutoritePublic {
    id: string;
    nom: string;
    prenom: string;
    email: string;
    telephone?: string;
    niveau: AutoriteNiveau;
    ville: string;
    region?: string;
    department?: string;
    arrondissement?: string;
    bureau?: string;
    is_active: boolean;
    must_change_password: boolean;
    created_at: Date;
}

export type PartenaireStatut = 'ACTIF' | 'SUSPENDU' | 'INACTIF';

export interface Partenaire {
    id: string;
    user_id: string;
    nom_organisation: string;
    adresse?: string | null;
    logo_url?: string | null;
    statut: PartenaireStatut;
    must_change_password: boolean;
    created_by?: string | null;
    created_at: Date;
    updated_at: Date;
}

export interface PartenairePublic extends Partenaire {
    email: string;
    telephone?: string | null;
    nom_contact?: string | null;
    prenom_contact?: string | null;
    ville?: string | null;
    region?: string | null;
    wallet_balance: number;
    is_verified: boolean;
}

export type TestimonialContext = 'MATCH' | 'RECOVERY';
export type TestimonialStatus = 'PUBLISHED' | 'HIDDEN';

export interface Testimonial {
    id: string;
    user_id: string;
    declaration_id: string;
    context: TestimonialContext;
    rating: number;
    comment: string;
    status: TestimonialStatus;
    created_at: Date;
    updated_at: Date;
}

export interface PublicTestimonial {
    id: string;
    author_label: string;
    context: TestimonialContext;
    rating: number;
    comment: string;
    created_at: Date;
}
