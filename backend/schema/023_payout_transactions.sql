-- Payout transactions: admin initiates payment, vendor confirms receipt.
-- Both main app and partner portal use the same DB so both can read/write.
CREATE TABLE IF NOT EXISTS payout_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  amount_cents bigint NOT NULL CHECK (amount_cents >= 0),
  status text NOT NULL DEFAULT 'pending_vendor_confirmation' CHECK (status IN ('pending_vendor_confirmation', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  vendor_confirmed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_payout_transactions_vendor_id ON payout_transactions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_payout_transactions_status ON payout_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payout_transactions_created_at ON payout_transactions(created_at DESC);

COMMENT ON TABLE payout_transactions IS 'Admin-initiated payouts to vendors; status becomes completed when vendor confirms receipt';
