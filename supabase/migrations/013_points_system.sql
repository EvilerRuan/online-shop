-- ============================================================
-- 013_points_system.sql
-- 积分系统相关表
-- ============================================================

-- ============================================================
-- 1. points_config - 积分规则配置表（KV 结构）
-- ============================================================
CREATE TABLE points_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO points_config (key, value) VALUES
    ('register_points', '100'),
    ('referral_points', '200'),
    ('first_purchase_points', '100');

CREATE TRIGGER update_points_config_updated_at BEFORE UPDATE ON points_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE points_config IS '积分规则配置表（KV 结构）';

-- ============================================================
-- 2. points_ledger - 积分流水记录表
-- ============================================================
CREATE TABLE points_ledger (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('earn', 'spend')),
    reason TEXT NOT NULL
        CHECK (reason IN ('register', 'referral', 'first_purchase', 'redeem', 'admin_adjust')),
    amount INT NOT NULL CHECK (amount > 0),
    balance_after INT NOT NULL CHECK (balance_after >= 0),
    remark TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_points_ledger_user_id ON points_ledger(user_id);
CREATE INDEX idx_points_ledger_type ON points_ledger(type);
CREATE INDEX idx_points_ledger_reason ON points_ledger(reason);
CREATE INDEX idx_points_ledger_created_at ON points_ledger(created_at DESC);

COMMENT ON TABLE points_ledger IS '积分流水记录表';
COMMENT ON COLUMN points_ledger.type IS '类型：earn=获得, spend=消耗';
COMMENT ON COLUMN points_ledger.reason IS '原因：register=注册, referral=推荐, first_purchase=首次收货, redeem=兑换, admin_adjust=管理员调整';
COMMENT ON COLUMN points_ledger.amount IS '积分变动数量（正数）';
COMMENT ON COLUMN points_ledger.balance_after IS '变动后的积分余额';

-- ============================================================
-- 3. points_products - 积分兑换商品表
-- ============================================================
CREATE TABLE points_products (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    image TEXT DEFAULT '',
    points_cost INT NOT NULL CHECK (points_cost > 0),
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_points_products_is_active ON points_products(is_active);

CREATE TRIGGER update_points_products_updated_at BEFORE UPDATE ON points_products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE points_products IS '积分兑换商品表';
COMMENT ON COLUMN points_products.name IS '商品名称';
COMMENT ON COLUMN points_products.image IS '商品图片 URL';
COMMENT ON COLUMN points_products.points_cost IS '兑换所需积分';
COMMENT ON COLUMN points_products.stock IS '库存数量';
COMMENT ON COLUMN points_products.is_active IS '是否启用';

-- ============================================================
-- 4. points_redeem_orders - 积分兑换订单表
-- ============================================================
CREATE TABLE points_redeem_orders (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    points_product_id BIGINT NOT NULL REFERENCES points_products(id),
    product_name TEXT NOT NULL,
    product_image TEXT DEFAULT '',
    points_used INT NOT NULL CHECK (points_used > 0),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'shipped', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_points_redeem_user_id ON points_redeem_orders(user_id);
CREATE INDEX idx_points_redeem_status ON points_redeem_orders(status);

CREATE TRIGGER update_points_redeem_orders_updated_at BEFORE UPDATE ON points_redeem_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE points_redeem_orders IS '积分兑换订单表';
COMMENT ON COLUMN points_redeem_orders.product_name IS '商品名称快照';
COMMENT ON COLUMN points_redeem_orders.product_image IS '商品图片快照';
COMMENT ON COLUMN points_redeem_orders.points_used IS '消耗的积分数';
COMMENT ON COLUMN points_redeem_orders.status IS '状态：pending=待发货, shipped=已发货, completed=已完成, cancelled=已取消';

-- ============================================================
-- 5. user_referrals - 推荐关系表
-- ============================================================
CREATE TABLE user_referrals (
    id BIGSERIAL PRIMARY KEY,
    referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    referred_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    points_awarded INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_user_referrals_referred_id ON user_referrals(referred_id);
CREATE INDEX idx_user_referrals_referrer_id ON user_referrals(referrer_id);

COMMENT ON TABLE user_referrals IS '推荐关系表';
COMMENT ON COLUMN user_referrals.referrer_id IS '推荐人 ID';
COMMENT ON COLUMN user_referrals.referred_id IS '被推荐人 ID（唯一，每人只能被推荐一次）';
COMMENT ON COLUMN user_referrals.points_awarded IS '奖励的积分数';

-- ============================================================
-- 积分操作 RPC 函数
-- ============================================================

-- 积分增加函数
CREATE OR REPLACE FUNCTION add_points(
    p_user_id UUID,
    p_reason TEXT,
    p_amount INT,
    p_remark TEXT DEFAULT ''
)
RETURNS VOID AS $$
DECLARE
    v_balance INT;
BEGIN
    -- 行锁
    SELECT points_balance INTO v_balance
    FROM profiles WHERE id = p_user_id
    FOR UPDATE;

    -- 更新余额
    UPDATE profiles
    SET points_balance = points_balance + p_amount
    WHERE id = p_user_id;

    -- 记录流水
    INSERT INTO points_ledger (user_id, type, reason, amount, balance_after, remark)
    VALUES (p_user_id, 'earn', p_reason, p_amount, v_balance + p_amount, p_remark);
END;
$$ LANGUAGE plpgsql;

-- 积分消耗函数
CREATE OR REPLACE FUNCTION spend_points(
    p_user_id UUID,
    p_reason TEXT,
    p_amount INT,
    p_remark TEXT DEFAULT ''
)
RETURNS BOOLEAN AS $$
DECLARE
    v_balance INT;
BEGIN
    -- 行锁
    SELECT points_balance INTO v_balance
    FROM profiles WHERE id = p_user_id
    FOR UPDATE;

    -- 校验余额
    IF v_balance < p_amount THEN
        RETURN false;
    END IF;

    -- 更新余额
    UPDATE profiles
    SET points_balance = points_balance - p_amount
    WHERE id = p_user_id;

    -- 记录流水
    INSERT INTO points_ledger (user_id, type, reason, amount, balance_after, remark)
    VALUES (p_user_id, 'spend', p_reason, p_amount, v_balance - p_amount, p_remark);

    RETURN true;
END;
$$ LANGUAGE plpgsql;
