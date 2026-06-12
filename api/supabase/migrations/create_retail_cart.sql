-- Create retail_cart table
CREATE TABLE IF NOT EXISTS retail_cart (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku_id BIGINT NOT NULL REFERENCES product_skus(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  remark TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, product_id, sku_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_retail_cart_user_id ON retail_cart(user_id);
CREATE INDEX IF NOT EXISTS idx_retail_cart_product_id ON retail_cart(product_id);
CREATE INDEX IF NOT EXISTS idx_retail_cart_sku_id ON retail_cart(sku_id);

-- Enable RLS
ALTER TABLE retail_cart ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can only view and modify their own cart items
CREATE POLICY "Users can view own cart"
  ON retail_cart FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cart"
  ON retail_cart FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cart"
  ON retail_cart FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cart"
  ON retail_cart FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can do everything (bypass RLS)
CREATE POLICY "Service role full access"
  ON retail_cart FOR ALL
  USING (true)
  WITH CHECK (true);
