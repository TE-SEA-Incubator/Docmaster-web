import dotenv from 'dotenv';
dotenv.config();

export interface NokashPayoutParams {
  amount: number;
  order_id: string;
  user_phone: string;
  payment_method?: string; // 'ORANGE_MONEY' | 'MTN_MOMO'
  country?: 'CM' | 'NG';
  user_email?: string;
  user_name?: string;
  user_bank_code?: string;
  user_bank_account?: string;
}

export interface NokashAuthKeyResponse {
  status: 'LOGIN_SUCCESS' | 'LOGIN_BAD_INFOS' | string;
  message?: string;
  data: string | null;
}

export interface NokashPayoutResponse {
  status: 'REQUEST_OK' | 'REQUEST_BAD_INFOS' | string;
  message?: string;
  data: {
    id: string;
    status: 'PENDING' | 'FAILED' | 'CANCELED' | 'TIMEOUT' | 'SUCCESS' | string;
    amount: number | string;
    orderId: string;
    phone?: string;
    [key: string]: any;
  } | null;
}

export class NokashPayoutService {
  private i_space_key = process.env.NOKASH_I_SPACE_KEY;
  private app_space_key = process.env.NOKASH_APP_SPACE_KEY;
  private baseUrl = process.env.NOKASH_BASE_URL || 'https://api.nokash.app/lapas-on-trans/trans';
  private payoutCallbackUrl =
    process.env.NOKASH_PAYOUT_CALLBACK_URL ||
    'https://api-v2.docmaster.net/api/withdrawals/nokash/callback';

  /**
   * Normaliser le numéro camerounais au format international 237XXXXXXXXX
   * et détection automatique de l'opérateur (Orange Money vs MTN MoMo)
   */
  private normalizeCameroonPhone(phone?: string) {
    const digits = (phone || '').toString().replace(/\D/g, '');

    if (!digits) {
      return { phone: '', operator: null as null | 'ORANGE_MONEY' | 'MTN_MOMO' };
    }

    let localNumber = digits;
    if (localNumber.startsWith('237') && localNumber.length >= 12) {
      localNumber = localNumber.slice(3);
    }

    // Détection des préfixes camerounais
    const operator = (() => {
      const prefix2 = localNumber.slice(0, 2);
      if (['65', '69'].includes(prefix2)) return 'ORANGE_MONEY' as const;
      if (['67', '68'].includes(prefix2)) return 'MTN_MOMO' as const;
      return null;
    })();

    const normalizedLocal = localNumber.padStart(9, '0').slice(0, 9);
    return {
      phone: `237${normalizedLocal}`,
      operator,
    };
  }

  /**
   * L'API /auth Nokash attend du form url-encoded (le JSON est rejeté avec
   * "i_space_key parameter is missing"). Les endpoints payout/status attendent
   * eux du JSON. Les objets imbriqués sont sérialisés en notation crochets :
   * user_data[user_phone]=...
   */
  private toFormBody(data: Record<string, any>): URLSearchParams {
    const params = new URLSearchParams();
    const append = (key: string, value: any) => {
      if (value === undefined || value === null) return;
      if (typeof value === 'object') {
        for (const [k, v] of Object.entries(value)) append(`${key}[${k}]`, v);
        return;
      }
      params.append(key, String(value));
    };
    for (const [k, v] of Object.entries(data)) append(k, v);
    return params;
  }

  /**
   * Étape 1 : Générer la clé d'authentification temporaire (auth-code)
   * Note : La clé est à usage unique et expire au bout de 2 minutes selon la doc Nokash.
   */
  async generateAuthKey(): Promise<string> {
    const iSpaceKey = this.i_space_key?.trim();
    const appSpaceKey = this.app_space_key?.trim();

    if (!iSpaceKey || !appSpaceKey) {
      throw new Error('[Nokash Payout] Clés manquantes: NOKASH_I_SPACE_KEY ou NOKASH_APP_SPACE_KEY');
    }

    const authUrl = `${this.baseUrl.replace(/\/api-(?:payin|payout)-request.*$/, '')}/auth`;
    const targetUrl = authUrl.includes('/lapas-on-trans/trans/auth')
      ? authUrl
      : 'https://api.nokash.app/lapas-on-trans/trans/auth';

    const body = {
      i_space_key: iSpaceKey,
      app_space_key: appSpaceKey,
    };

    console.log('🔑 [Nokash Payout] Requesting Auth Key from:', targetUrl);

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: this.toFormBody(body),
      });

      const result = (await response.json()) as NokashAuthKeyResponse;
      console.log('📥 [Nokash Payout Auth Response]', JSON.stringify(result, null, 2));

      if (result.status !== 'LOGIN_SUCCESS' || !result.data) {
        throw new Error(
          `Échec d'authentification Payout Nokash (${result.status}): ${result.message || 'Clés invalides'}`
        );
      }

      return result.data;
    } catch (error: any) {
      console.error('❌ [Nokash Payout Auth Error]:', error);
      throw new Error(`Erreur génération clé Payout Nokash: ${error.message}`);
    }
  }

  /**
   * Étape 2 : Initier le virement / retrait vers l'utilisateur (Mobile Money / Banque)
   */
  async initiatePayout(params: NokashPayoutParams): Promise<NokashPayoutResponse> {
    const country = params.country || 'CM';
    const payment_type = country === 'CM' ? 'CM_MOBILEMONEY' : 'NG_BANKTRANSFER';

    // 1. Obtenir le auth-code unique valide 2 min
    const authCode = await this.generateAuthKey();

    // 2. Normalisation du numéro et détection de l'opérateur
    const normalizedPhone = this.normalizeCameroonPhone(params.user_phone);
    const mapMethod = (m?: string) => {
      if (!m) return '';
      const u = m.toUpperCase();
      if (['ORANGE_MONEY', 'OM', 'ORANGE', 'ORANGE_CM'].includes(u)) return 'ORANGE_MONEY';
      if (['MTN_MOMO', 'MOMO', 'MTN', 'MTN_CM'].includes(u)) return 'MTN_MOMO';
      return u;
    };

    const requestedMethod = mapMethod(params.payment_method);
    const effectiveMethod =
      country === 'CM' && normalizedPhone.operator ? normalizedPhone.operator : requestedMethod;

    // 3. Construction des données utilisateur selon le pays
    const userData: any =
      country === 'CM'
        ? {
            user_phone: normalizedPhone.phone || params.user_phone,
          }
        : {
            user_email: params.user_email || '',
            user_name: params.user_name || '',
            user_bank_code: params.user_bank_code || '',
            user_bank_account: params.user_bank_account || '',
          };

    const payoutUrl = 'https://api.nokash.app/lapas-on-trans/trans/api-payout-request/407';

    const body: any = {
      i_space_key: this.i_space_key?.trim(),
      app_space_key: this.app_space_key?.trim(),
      payment_type,
      country,
      payment_method: country === 'CM' ? effectiveMethod : 'BANK_TRANSFER',
      order_id: params.order_id,
      amount: String(params.amount),
      callback_url: this.payoutCallbackUrl,
      user_data: userData,
    };

    console.log(
      '🚀 [Nokash Payout Body]',
      JSON.stringify({ ...body, i_space_key: '***', app_space_key: '***' }, null, 2)
    );

    try {
      const response = await fetch(payoutUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'auth-code': authCode,
        },
        body: JSON.stringify(body),
      });

      const result = (await response.json()) as NokashPayoutResponse;
      console.log('📥 [Nokash Payout Response]', JSON.stringify(result, null, 2));

      return result;
    } catch (error: any) {
      console.error('❌ [Nokash Payout Initiate Error]:', error);
      throw new Error(`Erreur lors de l'initiation du Payout Nokash: ${error.message}`);
    }
  }

  /**
   * Étape 3 : Vérifier le statut d'une transaction de retrait
   */
  async checkPayoutStatus(transactionId: string) {
    try {
      const url = `${this.baseUrl}/310/status-request`;
      const body = {
        transaction_id: transactionId,
        i_space_key: this.i_space_key?.trim(),
        app_space_key: this.app_space_key?.trim(),
      };

      console.log(
        '🔍 [Nokash Payout Status Request]',
        JSON.stringify({ url, transaction_id: transactionId }, null, 2)
      );

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: this.toFormBody(body),
      });

      const result = await response.json();
      console.log('📥 [Nokash Payout Status Response]', JSON.stringify(result, null, 2));
      return result;
    } catch (error: any) {
      console.error('❌ [Nokash Payout Status Check Error]:', error);
      throw new Error(`Erreur lors de la vérification du statut Payout: ${error.message}`);
    }
  }
}

export const nokashPayoutService = new NokashPayoutService();
