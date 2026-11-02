/**
 * Feature Flags Configuration
 * Controls which features are enabled in the application
 */

export interface FeatureFlags {
  USE_SHAREPAY: boolean;
  SHAREPAY_USER_TYPES: ('PARTNER' | 'USER')[];
  PAYMENT_PROVIDER: 'NOKASH' | 'SHAREPAY';
}

export const FEATURES: FeatureFlags = {
  // Enable SharePay payment provider
  USE_SHAREPAY: process.env.ENABLE_SHAREPAY === 'true',
  
  // Which user types use SharePay (PARTNER, USER, or both)
  SHAREPAY_USER_TYPES: (process.env.SHAREPAY_USER_TYPES || '')
    .split(',')
    .filter(Boolean)
    .map(t => t.trim() as 'PARTNER' | 'USER'),
  
  // Default payment provider
  PAYMENT_PROVIDER: (process.env.PAYMENT_PROVIDER === 'SHAREPAY' ? 'SHAREPAY' : 'NOKASH') as 'NOKASH' | 'SHAREPAY',
};

/**
 * Check if SharePay should be used for a specific user type
 */
export function shouldUseSharePay(userType: 'PARTNER' | 'USER'): boolean {
  if (!FEATURES.USE_SHAREPAY) {
    return false;
  }
  
  // If no specific types are configured, use SharePay for all
  if (FEATURES.SHAREPAY_USER_TYPES.length === 0) {
    return FEATURES.PAYMENT_PROVIDER === 'SHAREPAY';
  }
  
  // Check if this user type is in the allowed list
  return FEATURES.SHAREPAY_USER_TYPES.includes(userType);
}

/**
 * Get the payment provider for a specific user type
 */
export function getPaymentProvider(userType: 'PARTNER' | 'USER'): 'NOKASH' | 'SHAREPAY' {
  return shouldUseSharePay(userType) ? 'SHAREPAY' : 'NOKASH';
}

// Log feature flags on startup
if (process.env.NODE_ENV !== 'test') {
  console.log('\n📋 [Features] Configuration:');
  console.log(`   - USE_SHAREPAY: ${FEATURES.USE_SHAREPAY}`);
  console.log(`   - PAYMENT_PROVIDER: ${FEATURES.PAYMENT_PROVIDER}`);
  console.log(`   - SHAREPAY_USER_TYPES: ${FEATURES.SHAREPAY_USER_TYPES.join(', ') || 'ALL'}`);
  console.log('');
}
