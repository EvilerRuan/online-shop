-- ============================================================
-- 016_retail_home.sql
-- 零售端首页配置表
-- ============================================================

-- ============================================================
-- 1. retail_banners - 零售端轮播图表
-- ============================================================
CREATE TABLE retail_banners (
    id BIGSERIAL PRIMARY KEY,
    image_url TEXT NOT NULL,
    title TEXT DEFAULT '',
    link_url TEXT DEFAULT '',
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_retail_banners_sort ON retail_banners(sort_order);

CREATE TRIGGER update_retail_banners_updated_at BEFORE UPDATE ON retail_banners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE retail_banners IS '零售端轮播图表';
COMMENT ON COLUMN retail_banners.image_url IS '轮播图片 URL';
COMMENT ON COLUMN retail_banners.title IS '轮播图标题';
COMMENT ON COLUMN retail_banners.link_url IS '点击跳转链接';
COMMENT ON COLUMN retail_banners.sort_order IS '排序权重';
COMMENT ON COLUMN retail_banners.is_active IS '是否启用';

-- ============================================================
-- 2. retail_quick_icons - 零售端金刚区图标表
-- ============================================================
CREATE TABLE retail_quick_icons (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    icon_url TEXT DEFAULT '',
    link_url TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_retail_quick_icons_sort ON retail_quick_icons(sort_order);

CREATE TRIGGER update_retail_quick_icons_updated_at BEFORE UPDATE ON retail_quick_icons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE retail_quick_icons IS '零售端金刚区图标表';
COMMENT ON COLUMN retail_quick_icons.name IS '图标名称';
COMMENT ON COLUMN retail_quick_icons.icon_url IS '图标 URL';
COMMENT ON COLUMN retail_quick_icons.link_url IS '点击跳转链接';
COMMENT ON COLUMN retail_quick_icons.sort_order IS '排序权重';
COMMENT ON COLUMN retail_quick_icons.is_active IS '是否启用';

-- ============================================================
-- 3. retail_home_products - 零售端首页推荐商品关联表
-- ============================================================
CREATE TABLE retail_home_products (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_retail_home_products_product_id ON retail_home_products(product_id);
CREATE INDEX idx_retail_home_products_sort ON retail_home_products(sort_order);

COMMENT ON TABLE retail_home_products IS '零售端首页推荐商品关联表';

-- ============================================================
-- 新增 system_settings 键值
-- ============================================================
INSERT INTO system_settings (key, value) VALUES
    ('default_shipping_fee', '0'),
    ('default_free_threshold', '0'),
    ('customer_service_auto_reply', '您好，客服正在为您处理，请稍候。')
ON CONFLICT (key) DO NOTHING;
