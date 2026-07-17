-- Claim guest purchases for a newly authenticated user based on email.
-- This links historical guest orders/tickets to the user's account.
CREATE OR REPLACE FUNCTION public.claim_guest_purchases(
  p_email TEXT,
  p_user_id UUID
)
RETURNS TABLE(claimed_orders INTEGER, claimed_tickets INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_ids UUID[];
  v_claimed_orders INTEGER := 0;
  v_claimed_tickets INTEGER := 0;
BEGIN
  IF p_email IS NULL OR btrim(p_email) = '' OR p_user_id IS NULL THEN
    RETURN QUERY SELECT 0, 0;
    RETURN;
  END IF;

  SELECT array_agg(id)
  INTO v_order_ids
  FROM public.orders
  WHERE user_id IS NULL
    AND lower(coalesce(payment_metadata->'customer'->>'email', '')) = lower(btrim(p_email));

  IF v_order_ids IS NULL OR array_length(v_order_ids, 1) IS NULL THEN
    RETURN QUERY SELECT 0, 0;
    RETURN;
  END IF;

  UPDATE public.orders
  SET
    user_id = p_user_id,
    payment_metadata = jsonb_set(
      coalesce(payment_metadata, '{}'::jsonb),
      '{customer,userId}',
      to_jsonb(p_user_id::text),
      true
    ),
    updated_at = now()
  WHERE id = ANY(v_order_ids);

  GET DIAGNOSTICS v_claimed_orders = ROW_COUNT;

  UPDATE public.tickets
  SET
    user_id = p_user_id,
    updated_at = now()
  WHERE user_id IS NULL
    AND order_id = ANY(v_order_ids);

  GET DIAGNOSTICS v_claimed_tickets = ROW_COUNT;

  RETURN QUERY SELECT v_claimed_orders, v_claimed_tickets;
END;
$$;
