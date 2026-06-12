-- ============================================================
-- 011_extend_orders.sql
-- 扩展订单表，增加零售业务字段
-- ============================================================

-- 渠道标识（批发/零售）
ALTER TABLE orders ADD COLUMN channel TEXT NOT NULL DEFAULT 'wholesale'
    CHECK (channel IN ('wholesale', 'retail'));

-- 运费（零售订单）
ALTER TABLE orders ADD COLUMN shipping_fee DECIMAL(10,2) NOT NULL DEFAULT 0
    CHECK (shipping_fee >= 0);

-- 索引
CREATE INDEX idx_orders_channel ON orders(channel);

COMMENT ON COLUMN orders.channel IS '渠道：wholesale=批发, retail=零售';
COMMENT ON COLUMN orders.shipping_fee IS '运费（零售订单）';
