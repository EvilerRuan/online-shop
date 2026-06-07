-- Spec names (规格名称) management table
CREATE TABLE IF NOT EXISTS spec_names (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spec_names_sort ON spec_names(sort_order);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS set_spec_names_updated_at ON spec_names;
CREATE TRIGGER set_spec_names_updated_at
  BEFORE UPDATE ON spec_names
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed some common spec names
INSERT INTO spec_names (name, sort_order) VALUES
  ('个', 1),
  ('件', 2),
  ('箱', 3),
  ('包', 4),
  ('袋', 5),
  ('瓶', 6),
  ('盒', 7),
  ('罐', 8),
  ('套', 9),
  ('组', 10)
ON CONFLICT (name) DO NOTHING;
