-- Allow guest checkout by making user references optional on payment-created records
ALTER TABLE public.orders
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.tickets
  ALTER COLUMN user_id DROP NOT NULL;
