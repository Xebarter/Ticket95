-- Create orders table for TicketRevolution
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  total_price DECIMAL(10, 2) NOT NULL CHECK (total_price >= 0),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_event_id ON orders(event_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Organizers can view orders for their events" ON orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON orders;
DROP POLICY IF EXISTS "System can update orders" ON orders;
DROP POLICY IF EXISTS "Admins can update orders" ON orders;

-- Policy: Users can view their own orders
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Organizers can view orders for their events
CREATE POLICY "Organizers can view orders for their events" ON orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = orders.event_id 
      AND auth.uid() = events.organizer_id
    )
  );

-- Policy: Admins can view all orders
CREATE POLICY "Admins can view all orders" ON orders
  FOR SELECT USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Policy: Users can insert their own orders
CREATE POLICY "Users can insert own orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: System can update orders (for status changes)
CREATE POLICY "System can update orders" ON orders
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can update orders
CREATE POLICY "Admins can update orders" ON orders
  FOR UPDATE USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_updated_at_trigger ON orders;
CREATE TRIGGER orders_updated_at_trigger
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_orders_updated_at();

-- Function to handle order creation and ticket inventory
CREATE OR REPLACE FUNCTION process_order_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Decrease available tickets for the event
  UPDATE events 
  SET tickets_available = tickets_available - NEW.quantity
  WHERE id = NEW.event_id
  AND tickets_available >= NEW.quantity;
  
  -- Check if update was successful (tickets were available)
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not enough tickets available for this event';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS process_order_creation_trigger ON orders;
CREATE TRIGGER process_order_creation_trigger
  AFTER INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION process_order_creation();

-- Function to handle order refunds
CREATE OR REPLACE FUNCTION process_order_refund()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if status changed to 'refunded'
  IF OLD.status != 'refunded' AND NEW.status = 'refunded' THEN
    -- Return tickets to available inventory
    UPDATE events 
    SET tickets_available = tickets_available + NEW.quantity
    WHERE id = NEW.event_id;
    
    -- Update all tickets for this order to refunded status
    UPDATE tickets
    SET status = 'refunded'
    WHERE order_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS process_order_refund_trigger ON orders;
CREATE TRIGGER process_order_refund_trigger
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION process_order_refund();
