import dotenv from 'dotenv';
dotenv.config();

export interface NokashPaymentParams {
  payment_method: string;
  amount: number;
  order_id: string;
  user_phone?: string;
  user_email?: string;
  user_name?: string;
  country?: 'CM' | 'NG';
}

class NokashService {
  private i_space_key = process.env.NOKASH_I_SPACE_KEY;
  private app_space_key = process.env.NOKASH_APP_SPACE_KEY;
  private baseUrl = process.env.NOKASH_BASE_URL;
  private callbackUrl = process.env.NOKASH_CALLBACK_URL;

  /**
   * Normalize a Cameroon mobile money phone number to 237XXXXXXXXX and
   * infer the operator from the local prefix when possible.
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

    // Cameroon common mobile money prefixes (best-effort detection)
    const operator = (() => {
      const prefix2 = localNumber.slice(0, 2);
      if (['65', '69'].includes(prefix2)) return 'ORANGE_MONEY' as const;
      if (['67', '68'].includes(prefix2)) return 'MTN_MOMO' as const;
      return null;
    })();

    const normalizedLocal = localNumber.padStart(9, '0').slice(0, 9);
    return {
      phone: `237${normalizedLocal}`,
      operator
    };
  }

  /**
   * Initiate a payment via Nokash
   */
 /**
   * Initiate a payment via Nokash
   */
/**
   * Initiate a payment via Nokash
   */
/**
   * Initiate a payment via Nokash
   */
  async initiatePayment(params: NokashPaymentParams) {
    const country = params.country || 'CM';
    const payment_type = country === 'CM' ? 'CM_MOBILEMONEY' : 'NG_BANKTRANSFER';
    
    // Mapping strict basé sur tes deux méthodes acceptées : "ORANGE_MONEY" et "MTN_MOMO"
    const mapPaymentMethod = (m?: string) => {
      if (!m) return '';
      const u = m.toString().toUpperCase();
      if (u === 'ORANGE_MONEY' || u === 'OM' || u === 'ORANGE' || u === 'ORANGE_CM') {
        return 'ORANGE_MONEY';
      }
      if (u === 'MTN_MOMO' || u === 'MOMO' || u === 'MTN' || u === 'MTN_CM') {
        return 'MTN_MOMO';
      }
      return u;
    };

    const targetMethod = mapPaymentMethod(params.payment_method);
    const normalizedPhone = this.normalizeCameroonPhone(params.user_phone);
    const effectiveMethod = country === 'CM' && normalizedPhone.operator
      ? normalizedPhone.operator
      : targetMethod;

    if (country === 'CM' && params.user_phone) {
      console.log('📱 [Nokash] Phone normalized:', params.user_phone, '=>', normalizedPhone.phone, 'operator:', normalizedPhone.operator || 'unknown');
    }
    if (country === 'CM' && normalizedPhone.operator && targetMethod && targetMethod !== normalizedPhone.operator) {
      console.warn('⚠️ [Nokash] payment_method adjusted to match detected operator:', targetMethod, '=>', normalizedPhone.operator);
    }

    const body: any = {
      i_space_key: this.i_space_key?.trim(),
      app_space_key: this.app_space_key?.trim(),
      payment_type,
      country,
      payment_method: effectiveMethod, // Enverra strictement "ORANGE_MONEY" ou "MTN_MOMO"
            amount: String(params.amount),
      order_id: params.order_id,
      callback_url: this.callbackUrl || "https://votre-domaine.com/api/payments/nokash/callback",
      
      user_data: {
        user_phone: normalizedPhone.phone || params.user_phone
      }
    };

    console.log('📡 [Nokash Request Body]', JSON.stringify(body, null, 2));

    try {
      const response = await fetch(`${this.baseUrl}/api-payin-request/407`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();
      
      // Log crucial pour lire la réponse exacte retournée par Nokash à l'état brut
      console.log('📥 [Nokash Original Response]', JSON.stringify(result, null, 2));

      return result;
    } catch (error: any) {
      console.error('Nokash Initiate Error:', error);
      throw new Error(`Erreur lors de l'initialisation du paiement Nokash: ${error.message}`);
    }
  }
  /**
   * Check the status of a transaction
   */
  async checkStatus(transactionId: string) {
    try {
      const response = await fetch(`${this.baseUrl}/310/status-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction_id: transactionId })
      });

      const result = await response.json();
      return result;
    } catch (error: any) {
      console.error('Nokash Status Check Error:', error);
      throw new Error(`Erreur lors de la vérification du statut Nokash: ${error.message}`);
    }
  }
}

export const nokashService = new NokashService();
