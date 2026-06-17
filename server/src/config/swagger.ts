import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'DocMaster API Documentation',
      version: '1.0.0',
      description: 'Documentation officielle et interactive de l\'API DocMaster.',
      contact: {
        name: 'Support DocMaster',
        url: 'https://docmaster.cm',
        email: 'support@docmaster.cm',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: 'Serveur de Développement Local',
      },
      {
        url: 'http://217.154.126.24:5000/api',
        description: 'Serveur de Production',
      },
      {
        url: 'https://217.154.126.24:5000/api',
        description: 'Production (HTTPS)',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        // ─── USER ────────────────────────────────────────────
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            nom: { type: 'string' },
            prenom: { type: 'string' },
            email: { type: 'string', format: 'email' },
            telephone: { type: 'string', nullable: true },
            pays: { type: 'string' },
            ville: { type: 'string' },
            is_verified: { type: 'boolean' },
            code_invitation: { type: 'string', nullable: true },
            parrain_id: { type: 'string', format: 'uuid', nullable: true },
            points: { type: 'integer' },
            wallet_balance: { type: 'string' },
            date_naissance: { type: 'string', format: 'date', nullable: true },
            lieu_naissance: { type: 'string', nullable: true },
            photo_url: { type: 'string', nullable: true },
            currency: { type: 'string' },
            role: { type: 'string', enum: ['USER', 'ADMIN'] },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        // ─── DOCUMENT TYPE ──────────────────────────────────
        DocumentType: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            nom: { type: 'string' },
            code: { type: 'string' },
            description: { type: 'string', nullable: true },
            prix_retrouvaille: { type: 'number' },
            finder_percent: { type: 'number' },
            app_percent: { type: 'number' },
            points_recompense: { type: 'integer' },
            delai_expiration_mois: { type: 'integer' },
            icone: { type: 'string', nullable: true },
            categorie: { type: 'string', nullable: true },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        // ─── DOCUMENT DECLARATION ───────────────────────────
        DocumentDeclaration: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            identifiant_doc_dm: { type: 'string' },
            doc_type: { type: 'string' },
            owner_name: { type: 'string' },
            document_number: { type: 'string' },
            declaration_type: { type: 'string', enum: ['LOST', 'FOUND'] },
            status: { type: 'string', enum: ['AVAILABLE', 'SEARCHING', 'RETURNED', 'MATCHED'] },
            reporter_id: { type: 'string', format: 'uuid' },
            ville: { type: 'string' },
            region: { type: 'string' },
            pays: { type: 'string' },
            fingerprint: { type: 'string' },
            found_location: {
              type: 'object',
              nullable: true,
              properties: {
                city: { type: 'string' },
                lat: { type: 'number' },
                long: { type: 'number' },
              },
            },
            etat_physique: { type: 'string' },
            photo_recto: { type: 'string', nullable: true },
            photo_verso: { type: 'string', nullable: true },
            description: { type: 'string', nullable: true },
            date_expiration: { type: 'string', format: 'date', nullable: true },
            mode_contact: { type: 'string' },
            payment_status: { type: 'string', enum: ['PENDING', 'PAID'] },
            transactions_id: { type: 'string', format: 'uuid', nullable: true },
            date_naissance: { type: 'string', format: 'date', nullable: true },
            urgence_niveau: { type: 'string', nullable: true },
            recompense_montant: { type: 'number', nullable: true },
            date_perte: { type: 'string', format: 'date', nullable: true },
            telephone_contact: { type: 'string', nullable: true },
            email_contact: { type: 'string', nullable: true },
            quartier: { type: 'string', nullable: true },
            metadata: { type: 'object', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
            deleted_at: { type: 'string', format: 'date-time', nullable: true },
            deleted_reason: { type: 'string', nullable: true },
          },
        },
        // ─── MATCH ──────────────────────────────────────────
        Match: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            lost_declaration_id: { type: 'string', format: 'uuid' },
            found_declaration_id: { type: 'string', format: 'uuid' },
            score: { type: 'integer' },
            status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'REJECTED'] },
            details: {
              type: 'object',
              nullable: true,
              properties: {
                criteria: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      points: { type: 'integer' },
                      max: { type: 'integer' },
                      matched: { type: 'boolean' },
                      icon: { type: 'string' },
                      detail: { type: 'string', nullable: true },
                    },
                  },
                },
              },
            },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        // ─── CLAIM ──────────────────────────────────────────
        Claim: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            doc_id: { type: 'string', format: 'uuid' },
            owner_id: { type: 'string', format: 'uuid' },
            finder_id: { type: 'string', format: 'uuid' },
            verification_code: { type: 'string' },
            status: { type: 'string', enum: ['PENDING', 'VALIDATED', 'FAILED'] },
            verification_attempts: { type: 'integer' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        // ─── TRANSACTION ────────────────────────────────────
        Transaction: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            amount: { type: 'number' },
            currency: { type: 'string' },
            status: { type: 'string', enum: ['PENDING', 'SUCCESS', 'FAILED'] },
            payment_method: { type: 'string' },
            transact_id_external: { type: 'string', nullable: true },
            external_ref: { type: 'string', nullable: true },
            type: { type: 'string', enum: ['subscription', 'declarat_fee', 'finder_payout', 'recovery_fee'] },
            metadata: { type: 'object', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        // ─── SUBSCRIPTION ───────────────────────────────────
        Subscription: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            plan_name: { type: 'string' },
            status: { type: 'string' },
            expiry_date: { type: 'string', format: 'date-time' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        // ─── PLAN ───────────────────────────────────────────
        Plan: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            price: { type: 'number' },
            currency: { type: 'string' },
            features: { type: 'object', additionalProperties: true },
            duration_months: { type: 'integer' },
            is_featured: { type: 'boolean' },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        // ─── WITHDRAWAL REQUEST ─────────────────────────────
        WithdrawalRequest: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            amount: { type: 'number' },
            currency: { type: 'string' },
            payment_method: { type: 'string' },
            payment_details: { type: 'string' },
            status: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED'] },
            admin_id: { type: 'string', format: 'uuid', nullable: true },
            admin_comment: { type: 'string', nullable: true },
            transaction_id: { type: 'string', format: 'uuid', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            processed_at: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        // ─── DELETION REQUEST ───────────────────────────────
        DeletionRequest: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            declaration_id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            reason: { type: 'string' },
            reason_type: { type: 'string', enum: ['DUPLICATE', 'INCORRECT_DATA', 'NO_LONGER_NEEDED', 'PRIVACY', 'OTHER'] },
            status: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED', 'EXECUTED'] },
            admin_id: { type: 'string', format: 'uuid', nullable: true },
            admin_comment: { type: 'string', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
            reviewed_at: { type: 'string', format: 'date-time', nullable: true },
            executed_at: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        // ─── NOTIFICATION ───────────────────────────────────
        Notification: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            type: { type: 'string' },
            title: { type: 'string' },
            message: { type: 'string' },
            metadata: { type: 'object', nullable: true },
            is_read: { type: 'boolean' },
            channels: { type: 'object', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        // ─── USER DOCUMENT (My Documents Vault) ─────────────
        UserDocument: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            type_doc: { type: 'string' },
            numero_doc: { type: 'string' },
            nom_sur_doc: { type: 'string' },
            date_expiration: { type: 'string', format: 'date', nullable: true },
            date_delivrance: { type: 'string', format: 'date', nullable: true },
            nom_autorite: { type: 'string', nullable: true },
            notes: { type: 'string', nullable: true },
            fingerprint: { type: 'string' },
            photo_recto: { type: 'string', nullable: true },
            photo_verso: { type: 'string', nullable: true },
            is_protected: { type: 'boolean' },
            is_lost: { type: 'boolean' },
            declaration_id: { type: 'string', format: 'uuid', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        // ─── DEVICE ─────────────────────────────────────────
        Device: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            brand: { type: 'string', nullable: true },
            model: { type: 'string', nullable: true },
            color: { type: 'string', nullable: true },
            serial_number_imei: { type: 'string', nullable: true },
            assurance: { type: 'string', nullable: true },
            purchase_date: { type: 'string', format: 'date', nullable: true },
            photo_facture: { type: 'string', nullable: true },
            photo_face: { type: 'string', nullable: true },
            photo_serial: { type: 'string', nullable: true },
            status: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        // ─── SHARE ──────────────────────────────────────────
        Share: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            document_id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            token: { type: 'string' },
            expires_at: { type: 'string', format: 'date-time' },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        // ─── PAYMENT METHOD ─────────────────────────────────
        PaymentMethod: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            method_type: { type: 'string', enum: ['MTN', 'ORANGE', 'BANK'] },
            account_name: { type: 'string', nullable: true },
            account_number: { type: 'string' },
            bank_name: { type: 'string', nullable: true },
            is_default: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        // ─── EARNINGS ENTRY ─────────────────────────────────
        EarningsEntry: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            source_type: { type: 'string' },
            points_earned: { type: 'integer' },
            description: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        // ─── REFERRAL ───────────────────────────────────────
        Referral: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            referrer_id: { type: 'string', format: 'uuid' },
            referred_id: { type: 'string', format: 'uuid' },
            status: { type: 'string' },
            reward: { type: 'number', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        // ─── SETTING ────────────────────────────────────────
        Setting: {
          type: 'object',
          properties: {
            key: { type: 'string' },
            value: { type: 'string' },
          },
        },
        // ─── ACTIVITY LOG ───────────────────────────────────
        ActivityLog: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid', nullable: true },
            action_type: { type: 'string' },
            entity_type: { type: 'string', nullable: true },
            entity_id: { type: 'string', nullable: true },
            description: { type: 'string', nullable: true },
            metadata: { type: 'object', nullable: true },
            ip_address: { type: 'string', nullable: true },
            user_agent: { type: 'string', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        // ─── MATCHING STATS ─────────────────────────────────
        MatchingStats: {
          type: 'object',
          properties: {
            totalMatches: { type: 'integer' },
            highConfidence: { type: 'integer' },
            potential: { type: 'integer' },
            averageScore: { type: 'integer' },
          },
        },
        // ─── GENERIC RESPONSES ──────────────────────────────
        SuccessTrue: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
          },
        },
        SuccessWithData: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
          },
        },
        Error400: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
          },
        },
        Error401: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Accès non autorisé. Token manquant.' },
          },
        },
        Error403: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Accès interdit. Privilèges administrateur requis.' },
          },
        },
        Error404: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
          },
        },
        Error500: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    './index.ts',
    './server/index.ts',
    './src/routes/*.ts',
    './server/src/routes/*.ts',
  ],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
