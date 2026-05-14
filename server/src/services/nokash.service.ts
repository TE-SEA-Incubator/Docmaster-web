import dotenv from 'dotenv';
dotenv.config();

export interface NokashPaymentParams {
  payment_method: 'MTN_MOMO' | 'ORANGE_MONEY' | 'BANK_TRANSFER';
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
   * Initiate a payment via Nokash
   */
  async initiatePayment(params: NokashPaymentParams) {
    const country = params.country || 'CM';
    const payment_type = country === 'CM' ? 'CM_MOBILEMONEY' : 'NG_BANKTRANSFER';

    const body: any = {
      i_space_key: this.i_space_key,
      app_space_key: this.app_space_key,
      payment_type: payment_type,
      country: country,
      payment_method: params.payment_method,
      order_id: params.order_id,
      amount: params.amount,
      callback_url: this.callbackUrl,
      user_data: country === 'CM' 
        ? { user_phone: params.user_phone }
        : { user_email: params.user_email, user_name: params.user_name }
    };

    try {
      const response = await fetch(`${this.baseUrl}/api-payin-request/407`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await response.json();
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
