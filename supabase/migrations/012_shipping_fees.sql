-- ============================================================
-- 012_shipping_fees.sql
-- 城市运费配置表
-- ============================================================

CREATE TABLE shipping_fees (
    id BIGSERIAL PRIMARY KEY,
    province TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT '',
    fee_type TEXT NOT NULL DEFAULT 'fixed'
        CHECK (fee_type IN ('fixed', 'free_threshold', 'free')),
    base_fee DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (base_fee >= 0),
    free_threshold DECIMAL(10,2) DEFAULT 0 CHECK (free_threshold >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shipping_fees_province_city ON shipping_fees(province, city);
CREATE INDEX idx_shipping_fees_is_active ON shipping_fees(is_active);

COMMENT ON TABLE shipping_fees IS '城市运费配置表';
COMMENT ON COLUMN shipping_fees.province IS '省份';
COMMENT ON COLUMN shipping_fees.city IS '城市，空字符串表示该省所有城市';
COMMENT ON COLUMN shipping_fees.fee_type IS '运费类型：fixed=固定运费, free_threshold=满额免运费, free=包邮';
COMMENT ON COLUMN shipping_fees.base_fee IS '基础运费';
COMMENT ON COLUMN shipping_fees.free_threshold IS '免运费阈值（fee_type=free_threshold 时使用）';
COMMENT ON COLUMN shipping_fees.is_active IS '是否启用';

-- 自动更新 updated_at 触发器
CREATE TRIGGER update_shipping_fees_updated_at BEFORE UPDATE ON shipping_fees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 运费计算函数
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_shipping_fee(
    p_province TEXT,
    p_city TEXT,
    p_order_amount DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
    v_fee_type TEXT;
    v_base_fee DECIMAL;
    v_free_threshold DECIMAL;
    v_default_fee DECIMAL;
BEGIN
    -- 1. 精确匹配省+市
    SELECT fee_type, base_fee, free_threshold
    INTO v_fee_type, v_base_fee, v_free_threshold
    FROM shipping_fees
    WHERE province = p_province AND city = p_city AND is_active = true
    LIMIT 1;

    -- 2. 省级匹配（city 为空）
    IF v_fee_type IS NULL THEN
        SELECT fee_type, base_fee, free_threshold
        INTO v_fee_type, v_base_fee, v_free_threshold
        FROM shipping_fees
        WHERE province = p_province AND city = '' AND is_active = true
        LIMIT 1;
    END IF;

    -- 3. 默认运费
    IF v_fee_type IS NULL THEN
        SELECT COALESCE(
            (SELECT value::DECIMAL FROM system_settings WHERE key = 'default_shipping_fee'),
            0
        ) INTO v_default_fee;
        RETURN v_default_fee;
    END IF;

    -- 4. 计算运费
    IF v_fee_type = 'free' THEN
        RETURN 0;
    ELSIF v_fee_type = 'free_threshold' AND p_order_amount >= v_free_threshold THEN
        RETURN 0;
    ELSE
        RETURN v_base_fee;
    END IF;
END;
$$ LANGUAGE plpgsql;
