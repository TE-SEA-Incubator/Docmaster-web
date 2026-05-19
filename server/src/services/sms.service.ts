import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

interface OrangeTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: string;
}

export class SmsService {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  private readonly clientId = process.env.ORANGE_CLIENT_ID;
  private readonly clientSecret = process.env.ORANGE_CLIENT_SECRET;
  private readonly senderPhone = process.env.ORANGE_DEV_PHONE; // Example: 237XXXXXXXXX

  /**
   * Get valid access token from Orange API
   */
  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    
    // Return cached token if valid (with 1 minute buffer)
    if (this.accessToken && this.tokenExpiry > now + 60000) {
      return this.accessToken;
    }

    if (!this.clientId || !this.clientSecret) {
      throw new Error('Orange API credentials missing in environment variables');
    }

    try {
      const authHeader = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const response = await axios.post<OrangeTokenResponse>(
        'https://api.orange.com/oauth/v3/token',
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = response.data.access_token;
      // expires_in is in seconds, convert to absolute timestamp in ms
      this.tokenExpiry = now + parseInt(response.data.expires_in) * 1000;
      
      return this.accessToken;
    } catch (error: any) {
      console.error('❌ Failed to get Orange SMS token:', error.response?.data || error.message);
      throw new Error('SMS authentication failed');
    }
  }

  /**
   * Format phone number to international format tel:+237XXXXXXXXX
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // If starts with 00, replace with nothing
    if (cleaned.startsWith('00')) cleaned = cleaned.substring(2);
    
    // Ensure it starts with 237
    if (!cleaned.startsWith('237')) {
      // If it starts with 6 (common in CM), prepend 237
      if (cleaned.length === 9) {
        cleaned = '237' + cleaned;
      }
    }
    
    return `tel:+${cleaned}`;
  }

  /**
   * Send SMS via Orange API
   */
  async sendSms(to: string, message: string): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      const formattedTo = this.formatPhoneNumber(to);
      const formattedFrom = this.formatPhoneNumber(this.senderPhone || '');

      // The sender address in the URL must be the dev phone number (or shortcode)
      const url = `https://api.orange.com/smsmessaging/v1/outbound/${encodeURIComponent(formattedFrom)}/requests`;

      const body: any = {
        outboundSMSMessageRequest: {
          address: formattedTo,
          senderAddress: formattedFrom,
          outboundSMSTextMessage: {
            message: message
          }
        }
      };

      // Add custom sender name if configured
      if (process.env.ORANGE_SENDER_NAME) {
        body.outboundSMSMessageRequest.senderName = process.env.ORANGE_SENDER_NAME;
      }

      const response = await axios.post(url, body, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 201 || response.status === 200) {
        console.log(`✅ SMS sent successfully to ${to}`);
        return true;
      }

      return false;
    } catch (error: any) {
      console.error(`❌ Failed to send SMS to ${to}:`, error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Send OTP specifically
   */
  async sendOtp(to: string, code: string): Promise<boolean> {
    const message = `Votre code de verification DocMaster est : ${code}. Il expire dans 10 minutes.`;
    return this.sendSms(to, message);
  }

  /**
   * Get SMS Balance (Admin)
   */
  async getBalance(): Promise<any> {
    try {
      const token = await this.getAccessToken();
      const response = await axios.get('https://api.orange.com/sms/admin/v1/contracts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to fetch SMS balance:', error.response?.data || error.message);
      throw new Error('Impossible de récupérer le solde SMS');
    }
  }

  /**
   * Get Usage Statistics (Admin)
   */
  async getUsage(): Promise<any> {
    try {
      const token = await this.getAccessToken();
      const response = await axios.get('https://api.orange.com/sms/admin/v1/statistics', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to fetch SMS statistics:', error.response?.data || error.message);
      throw new Error('Impossible de récupérer les statistiques SMS');
    }
  }

  /**
   * Get Purchase History (Admin)
   */
  async getPurchaseHistory(): Promise<any> {
    try {
      const token = await this.getAccessToken();
      const response = await axios.get('https://api.orange.com/sms/admin/v1/purchaseorders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to fetch SMS purchase history:', error.response?.data || error.message);
      throw new Error('Impossible de récupérer l\'historique des achats SMS');
    }
  }
}
