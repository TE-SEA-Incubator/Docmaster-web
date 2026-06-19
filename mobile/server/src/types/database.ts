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
    photo_url?: string;
    currency: string;
    role: 'USER' | 'ADMIN';
    created_at: Date;
    updated_at: Date;
}

export type DeclarationType = 'LOST' | 'FOUND';
export type DocumentStatus = 'AVAILABLE' | 'SEARCHING' | 'RETURNED' | 'MATCHED';

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
    created_at: Date;
    updated_at?: Date;
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
    created_at: Date;
}

export interface Claim {
    id: string;
    doc_id: string;
    owner_id: string;
    finder_id: string;
    verification_code: string;
    status: 'PENDING' | 'VALIDATED' | 'FAILED';
    verification_attempts: number;
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
