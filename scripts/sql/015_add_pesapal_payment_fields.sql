-- Add payment integration fields to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_provider TEXT,
  ADD COLUMN IF NOT EXISTS payment_tracking_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_merchant_reference TEXT,
  ADD COLUMN IF NOT EXISTS payment_metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_orders_payment_tracking_id ON public.orders(payment_tracking_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_merchant_reference ON public.orders(payment_merchant_reference);
