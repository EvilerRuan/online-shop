-- ============================================================
-- 010_extend_products.sql
-- 扩展商品表，增加零售业务字段
-- ============================================================

-- 零售价
ALTER TABLE products ADD COLUMN retail_price DECIMAL(10,2) DEFAULT 0
    CHECK (retail_price >= 0);

-- 销售渠道（批发/零售/双渠道）
ALTER TABLE products ADD COLUMN sales_channel TEXT NOT NULL DEFAULT 'both'
    CHECK (sales_channel IN ('wholesale', 'retail', 'both'));

-- 索引
CREATE INDEX idx_products_sales_channel ON products(sales_channel);

COMMENT ON COLUMN products.retail_price IS '零售价';
COMMENT ON COLUMN products.sales_channel IS '销售渠道：wholesale=仅批发, retail=仅零售, both=双渠道';
