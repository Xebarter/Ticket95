-- =====================================================
-- 029: Newsletter recipient groups
-- =====================================================

CREATE TABLE IF NOT EXISTS newsletter_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_newsletter_groups_name
  ON newsletter_groups (name);

ALTER TABLE newsletter_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage newsletter groups" ON newsletter_groups;
CREATE POLICY "Admins can manage newsletter groups"
  ON newsletter_groups
  FOR ALL
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE OR REPLACE FUNCTION update_newsletter_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS newsletter_groups_updated_at_trigger ON newsletter_groups;
CREATE TRIGGER newsletter_groups_updated_at_trigger
  BEFORE UPDATE ON newsletter_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_newsletter_groups_updated_at();

CREATE TABLE IF NOT EXISTS newsletter_group_members (
  group_id UUID NOT NULL REFERENCES newsletter_groups(id) ON DELETE CASCADE,
  subscriber_id UUID NOT NULL REFERENCES newsletter_subscribers(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  added_by UUID REFERENCES users(id) ON DELETE SET NULL,
  PRIMARY KEY (group_id, subscriber_id)
);

CREATE INDEX IF NOT EXISTS idx_newsletter_group_members_subscriber
  ON newsletter_group_members (subscriber_id);

ALTER TABLE newsletter_group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage newsletter group members" ON newsletter_group_members;
CREATE POLICY "Admins can manage newsletter group members"
  ON newsletter_group_members
  FOR ALL
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Record which groups a campaign targeted
ALTER TABLE marketing_campaigns
  ADD COLUMN IF NOT EXISTS target_group_ids UUID[] NOT NULL DEFAULT '{}'::uuid[];

-- Seed locked Website subscribers group
INSERT INTO newsletter_groups (name, slug, description, is_system)
VALUES (
  'Website subscribers',
  'website',
  'People who subscribed via the website footer. Kept separate from imported lists.',
  true
)
ON CONFLICT (slug) DO NOTHING;

-- Backfill footer subscribers into Website subscribers
INSERT INTO newsletter_group_members (group_id, subscriber_id)
SELECT g.id, s.id
FROM newsletter_groups g
CROSS JOIN newsletter_subscribers s
WHERE g.slug = 'website'
  AND s.source = 'footer'
ON CONFLICT DO NOTHING;
