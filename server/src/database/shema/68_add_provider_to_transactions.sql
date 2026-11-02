-- Migration: Add provider column to wallet_transactions and withdrawals
-- Date: 2026-10-07
-- Description: Support for multiple payment providers (NokashPay, SharePay)

-- Add provider column to wallet_transactions
ALTER TABLE wallet_transactions 
ADD COLUMN IF NOT EXISTS provider VARCHAR(20) DEFAULT 'NOKASH';

-- Add provider_reference column for external transaction IDs
ALTER TABLE wallet_transactions 
ADD COLUMN IF NOT EXISTS provider_reference VARCHAR(100);

-- Add metadata column for storing provider-specific data
ALTER TABLE wallet_transactions 
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_provider 
ON wallet_transactions(provider);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_provider_reference 
ON wallet_transactions(provider_reference);

-- Add provider_reference to withdrawals table
ALTER TABLE withdrawals 
ADD COLUMN IF NOT EXISTS provider_reference VARCHAR(100);

-- Add metadata column to withdrawals
ALTER TABLE withdrawals 
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- NOTE: withdrawal_reference column and its index are added in migration 81
-- (idx_withdrawals_withdrawal_reference is created there with the proper partial index)

-- Add comments
COMMENT ON COLUMN wallet_transactions.provider IS 'Payment provider: NOKASH or SHAREPAY';
COMMENT ON COLUMN wallet_transactions.provider_reference IS 'External transaction reference from payment provider';
COMMENT ON COLUMN wallet_transactions.metadata IS 'Provider-specific transaction metadata';
COMMENT ON COLUMN withdrawals.provider_reference IS 'External payout reference from payment provider';
COMMENT ON COLUMN withdrawals.metadata IS 'Provider-specific payout metadata';
