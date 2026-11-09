import axios from 'axios';
type AxiosInstance = ReturnType<typeof axios.create>;
import crypto from 'crypto';

interface SharePayConfig {
  apiKey: string;
  baseUrl: string;
}

interface SharePayResponse<T> {
  success: boolean;
  code: string;
  message: string;
  data: T | null;
  timestamp: string;
}

interface CheckoutRequest {
  amount: number;
  currency: string;
  merchantReference?: string;
  description?: string;
  successUrl?: string;
  cancelUrl?: string;
}

interface CheckoutResponse {
  reference: string;
  status: 'PENDING';
  amount: number;
  currency: string;
  description?: string;
  paymentUrl: string;
}

interface ChargeRequest {
  amount: number;
  currency: string;
  paymentMethod: 'MTN_MOMO_CM' | 'ORANGE_MONEY_CM';
  payerAccount: string;
  payerName?: string;
  payerEmail?: string;
  merchantReference?: string;
  description?: string;
  idempotencyKey?: string;
}

interface TransferRequest {
  amount: number;
  currency: string;
  paymentMethod: 'MTN_MOMO_CM' | 'ORANGE_MONEY_CM';
  beneficiaryAccount: string;
  beneficiaryName: string;
  beneficiaryEmail?: string;
  merchantReference?: string;
  description?: string;
}

interface TransactionStatus {
  reference: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
  amount: number;
  currency: string;
  paymentMethod?: string;
  [key: string]: any;
}

export class SharePayService {
  private client: AxiosInstance;

  constructor(config: SharePayConfig) {
    this.client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': config.apiKey,
      },
      timeout: 30000,
    });

    // Log all requests in development
    if (process.env.NODE_ENV !== 'production') {
      this.client.interceptors.request.use((config: any) => {
        console.log(`[SharePay] ${config.method?.toUpperCase()} ${config.url}`, config.data);
        return config;
      });

      this.client.interceptors.response.use(
        (response: any) => {
          console.log(`[SharePay] Response:`, response.data);
          return response;
        },
        (error: any) => {
          console.error(`[SharePay] Error:`, error.response?.data || error.message);
          return Promise.reject(error);
        }
      );
    }
  }

  /**
   * Créer une session de paiement checkout (avec page hébergée)
   */
  async createCheckout(params: CheckoutRequest): Promise<CheckoutResponse> {
    try {
      console.log(`[SharePay] POST /api/v1/pay-in/checkout`, {
        amount: params.amount,
        currency: params.currency,
        merchantReference: params.merchantReference,
        description: params.description,
      });

      const { data } = await this.client.post<SharePayResponse<CheckoutResponse>>(
        '/api/v1/pay-in/checkout',
        params
      );

      if (!data.success || !data.data) {
        console.error('[SharePay] createCheckout failed:', data);
        throw new Error(data.message || 'Échec de création du checkout');
      }

      console.log(`[SharePay] ✅ Checkout créé:`, {
        reference: data.data.reference,
        status: data.data.status,
        paymentUrl: data.data.paymentUrl,
      });

      return data.data;
    } catch (error: any) {
      console.error('[SharePay] createCheckout error:', error.response?.data || error.message);
      throw this.handleError(error);
    }
  }

  /**
   * SharePay attend un numéro au format international camerounais (237XXXXXXXXX).
   */
  private normalizeAccount(account?: string): string {
    let digits = String(account ?? '').replace(/\D/g, '');
    if (digits.startsWith('00237')) digits = digits.slice(2);
    if (digits.length === 9) digits = `237${digits}`;
    return digits;
  }

  /**
   * Initier un paiement direct (charge)
   */
  async createCharge(params: ChargeRequest): Promise<TransactionStatus> {
    try {
      const payload: ChargeRequest = {
        ...params,
        payerAccount: this.normalizeAccount(params.payerAccount),
      };

      console.log(`[SharePay] POST /api/v1/pay-in/charge`, {
        amount: payload.amount,
        currency: payload.currency,
        paymentMethod: payload.paymentMethod,
        payerAccount: payload.payerAccount?.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2'),
        merchantReference: payload.merchantReference,
        idempotencyKey: payload.idempotencyKey,
      });

      const { data } = await this.client.post<SharePayResponse<TransactionStatus>>(
        '/api/v1/pay-in/charge',
        payload
      );

      if (!data.success || !data.data) {
        console.error('[SharePay] createCharge failed:', data);
        throw new Error(data.message || "Échec d'initiation du paiement");
      }

      console.log(`[SharePay] ✅ Charge créée:`, {
        reference: data.data.reference,
        status: data.data.status,
        amount: data.data.amount,
        currency: data.data.currency,
      });

      return data.data;
    } catch (error: any) {
      console.error('[SharePay] createCharge error:', error.response?.data || error.message);
      throw this.handleError(error);
    }
  }

  /**
   * Vérifier le statut d'un paiement entrant
   */
  async getPayInStatus(reference: string): Promise<TransactionStatus> {
    try {
      const { data } = await this.client.get<SharePayResponse<TransactionStatus>>(
        `/api/v1/pay-in/check_status/${reference}`
      );

      if (!data.success || !data.data) {
        throw new Error(data.message || 'Échec de récupération du statut');
      }

      return data.data;
    } catch (error: any) {
      console.error('[SharePay] getPayInStatus error:', error.response?.data || error.message);
      throw this.handleError(error);
    }
  }

  /**
   * Créer un virement (payout)
   */
  async createTransfer(params: TransferRequest): Promise<TransactionStatus> {
    try {
      const payload: TransferRequest = {
        ...params,
        beneficiaryAccount: this.normalizeAccount(params.beneficiaryAccount),
      };

      console.log(`[SharePay] POST /api/v1/pay-out/transfer`, {
        amount: payload.amount,
        currency: payload.currency,
        paymentMethod: payload.paymentMethod,
        beneficiaryAccount: payload.beneficiaryAccount?.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2'),
        beneficiaryName: payload.beneficiaryName,
        merchantReference: payload.merchantReference,
      });

      const { data } = await this.client.post<SharePayResponse<TransactionStatus>>(
        '/api/v1/pay-out/transfer',
        payload
      );

      if (!data.success || !data.data) {
        console.error('[SharePay] createTransfer failed:', data);
        throw new Error(data.message || "Échec d'initiation du virement");
      }

      console.log(`[SharePay] ✅ Transfer créé:`, {
        reference: data.data.reference,
        status: data.data.status,
        amount: data.data.amount,
        currency: data.data.currency,
      });

      return data.data;
    } catch (error: any) {
      console.error('[SharePay] createTransfer error:', error.response?.data || error.message);
      throw this.handleError(error);
    }
  }

  /**
   * Vérifier le statut d'un paiement sortant
   */
  async getPayOutStatus(reference: string): Promise<TransactionStatus> {
    try {
      const { data } = await this.client.get<SharePayResponse<TransactionStatus>>(
        `/api/v1/pay-out/check_status/${reference}`
      );

      if (!data.success || !data.data) {
        throw new Error(data.message || 'Échec de récupération du statut');
      }

      return data.data;
    } catch (error: any) {
      console.error('[SharePay] getPayOutStatus error:', error.response?.data || error.message);
      throw this.handleError(error);
    }
  }

  /**
   * Get account balance
   */
  async getBalance(): Promise<{ balance: number; currency: string }> {
    try {
      const response = await this.client.get<SharePayResponse<{ balance: number; currency: string }>>('/account/balance');
      const data = response.data;

      if (!data.success || !data.data) {
        throw new Error(data.message || 'Échec de récupération du solde');
      }

      return data.data;
    } catch (error: any) {
      console.error('[SharePay] getBalance error:', error.response?.data || error.message);
      throw this.handleError(error);
    }
  }

  /**
   * Vérifier la signature webhook HMAC-SHA256
   */
  verifyWebhookSignature(
    rawBody: string,
    signatureHeader: string,
    secret: string
  ): boolean {
    try {
      // Format: "t=1735900000,v1=9f8c3a..."
      const parts = Object.fromEntries(
        signatureHeader.split(',').map((p) => p.split('='))
      );

      if (!parts.v1) {
        console.error('[SharePay] Missing v1 signature in header');
        return false;
      }

      const hmac = crypto.createHmac('sha256', secret);
      const digest = hmac.update(rawBody).digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(parts.v1, 'hex'),
        Buffer.from(digest, 'hex')
      );
    } catch (error: any) {
      console.error('[SharePay] Signature verification error:', error.message);
      return false;
    }
  }

  /**
   * Handle and format SharePay errors
   */
  private handleError(error: any): Error {
    if (error.response?.data) {
      const { code, message } = error.response.data;
      const errorMessage = this.getErrorMessage(code) || message || 'Erreur SharePay';
      const err = new Error(errorMessage);
      (err as any).code = code;
      (err as any).statusCode = error.response.status;
      return err;
    }

    return error;
  }

  /**
   * Get user-friendly error messages
   */
  private getErrorMessage(code: string): string | null {
    const messages: Record<string, string> = {
      VALIDATION_ERROR: 'Données invalides. Vérifiez les informations saisies.',
      MALFORMED_JSON: 'Format de données invalide.',
      PROVIDER_NOT_SUPPORTED: 'Opérateur non supporté.',
      AMOUNT_BELOW_MINIMUM: 'Montant en dessous du minimum autorisé.',
      AMOUNT_ABOVE_MAXIMUM: 'Montant au-dessus du maximum autorisé.',
      UNAUTHORIZED: 'Accès non autorisé. Vérifiez votre clé API.',
      NOT_FOUND: 'Transaction introuvable.',
      DUPLICATE_REQUEST: 'Cette transaction a déjà été effectuée.',
      INSUFFICIENT_BALANCE: 'Solde insuffisant pour effectuer ce retrait.',
      RATE_LIMIT_EXCEEDED: 'Trop de tentatives. Veuillez patienter quelques minutes.',
      INTERNAL_ERROR: 'Erreur interne du serveur. Réessayez plus tard.',
      MTN_GATEWAY_ERROR: 'Service MTN temporairement indisponible. Réessayez plus tard.',
      ORANGE_GATEWAY_ERROR: 'Service Orange Money temporairement indisponible. Réessayez plus tard.',
    };

    return messages[code] || null;
  }
}

// Instance singleton
let sharePayInstance: SharePayService | null = null;

export function getSharePayService(): SharePayService {
  if (!sharePayInstance) {
    const mode = process.env.SHAREPAY_MODE || 'test';
    const apiKey = mode === 'live'
      ? process.env.SHAREPAY_API_KEY_LIVE
      : process.env.SHAREPAY_API_KEY_TEST;

    if (!apiKey) {
      throw new Error(`SharePay API key not found for mode: ${mode}`);
    }

    const baseUrl = process.env.SHAREPAY_BASE_URL || 'https://sharepay-api.te-sea.com';

    sharePayInstance = new SharePayService({
      apiKey,
      baseUrl,
    });

    console.log(`[SharePay] Initialized in ${mode} mode`);
  }

  return sharePayInstance;
}
