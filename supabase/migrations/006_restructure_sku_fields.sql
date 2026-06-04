-- Move price, stock, min_order_qty from product_skus to products
-- product_skus will only have: sku_name and quantity

-- Step 1: Add columns to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (price >= 0);
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0);
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_order_qty INT NOT NULL DEFAULT 1 CHECK (min_order_qty >= 1);

-- Step 2: Add quantity column to product_skus
ALTER TABLE product_skus ADD COLUMN IF NOT EXISTS quantity INT NOT NULL DEFAULT 0 CHECK (quantity >= 0);

-- Step 3: Drop old columns from product_skus (after data migration if needed)
ALTER TABLE product_skus DROP COLUMN IF EXISTS price;
ALTER TABLE product_skus DROP COLUMN IF EXISTS stock;
ALTER TABLE product_skus DROP COLUMN IF EXISTS min_order_qty;

COMMENT ON COLUMN products.price IS '商品价格';
COMMENT ON COLUMN products.stock IS '商品总库存';
COMMENT ON COLUMN products.min_order_qty IS '最小起订量';
COMMENT ON COLUMN product_skus.quantity IS '该规格对应的数量';
