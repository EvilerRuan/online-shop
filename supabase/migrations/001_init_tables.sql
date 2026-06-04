-- ============================================================
-- 001_init_tables.sql
-- 在线商城项目 - 初始化数据库表结构
-- ============================================================

-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. profiles - 用户资料表
-- ============================================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    user_no BIGSERIAL UNIQUE NOT NULL,
    username TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_phone ON profiles(phone);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_user_no ON profiles(user_no);

COMMENT ON TABLE profiles IS '用户资料表';
COMMENT ON COLUMN profiles.user_no IS '用户编号，自增序列';
COMMENT ON COLUMN profiles.role IS '用户角色：user-普通用户, admin-管理员';
COMMENT ON COLUMN profiles.status IS '账号状态：active-正常, disabled-禁用';

-- ============================================================
-- 2. categories - 商品分类表（支持树形结构）
-- ============================================================
CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id BIGINT REFERENCES categories(id) ON DELETE CASCADE,
    sort_order INT NOT NULL DEFAULT 0,
    show_in_client BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_sort_order ON categories(sort_order);
CREATE INDEX idx_categories_show_in_client ON categories(show_in_client);

COMMENT ON TABLE categories IS '商品分类表，支持多级分类';
COMMENT ON COLUMN categories.parent_id IS '父分类ID，NULL表示顶级分类';
COMMENT ON COLUMN categories.show_in_client IS '是否在客户端显示';

-- ============================================================
-- 3. products - 商品表
-- ============================================================
CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    product_no TEXT NOT NULL UNIQUE,
    barcode TEXT,
    category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    main_image TEXT,
    description TEXT NOT NULL DEFAULT '',
    sales_count INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_product_no ON products(product_no);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_sales_count ON products(sales_count DESC);
CREATE INDEX idx_products_created_at ON products(created_at DESC);

COMMENT ON TABLE products IS '商品主表';
COMMENT ON COLUMN products.product_no IS '商品编号，唯一标识';
COMMENT ON COLUMN products.barcode IS '商品条形码';
COMMENT ON COLUMN products.status IS '商品状态：active-上架, inactive-下架';

-- ============================================================
-- 4. product_skus - 商品SKU表
-- ============================================================
CREATE TABLE product_skus (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku_name TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    min_order_qty INT NOT NULL DEFAULT 1 CHECK (min_order_qty >= 1),
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_skus_product_id ON product_skus(product_id);
CREATE INDEX idx_product_skus_sort_order ON product_skus(product_id, sort_order);

COMMENT ON TABLE product_skus IS '商品SKU表，支持多规格';
COMMENT ON COLUMN product_skus.min_order_qty IS '最小起订量';

-- ============================================================
-- 5. cart - 购物车表
-- ============================================================
CREATE TABLE cart (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku_id BIGINT NOT NULL REFERENCES product_skus(id) ON DELETE CASCADE,
    quantity INT CHECK (quantity >= 1),
    remark TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 同一用户同一SKU只保留一条记录
CREATE UNIQUE INDEX idx_cart_user_product_sku ON cart(user_id, product_id, sku_id);
CREATE INDEX idx_cart_user_id ON cart(user_id);

COMMENT ON TABLE cart IS '购物车表';
COMMENT ON COLUMN cart.remark IS '用户备注';

-- ============================================================
-- 6. orders - 订单表
-- ============================================================
CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,
    order_no TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES profiles(id),
    total_amount DECIMAL(10, 2) CHECK (total_amount >= 0),
    status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (
        status IN (
            'pending_payment',    -- 待付款
            'pending_shipment',   -- 待发货
            'pending_receipt',    -- 待收货
            'completed',          -- 已完成
            'cancelled'           -- 已取消
        )
    ),
    remark TEXT NOT NULL DEFAULT '',
    recipient_name TEXT NOT NULL,
    recipient_phone TEXT NOT NULL,
    address TEXT NOT NULL,
    shipping_no TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_order_no ON orders(order_no);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

COMMENT ON TABLE orders IS '订单主表';
COMMENT ON COLUMN orders.order_no IS '订单编号，格式：YYYYMMDDHH24MISS + 6位随机数';
COMMENT ON COLUMN orders.status IS '订单状态：pending_payment-待付款, pending_shipment-待发货, pending_receipt-待收货, completed-已完成, cancelled-已取消';
COMMENT ON COLUMN orders.shipping_no IS '物流单号';

-- ============================================================
-- 7. order_items - 订单明细表（快照数据，不设外键约束）
-- ============================================================
CREATE TABLE order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL,
    sku_id BIGINT NOT NULL,
    product_name TEXT NOT NULL,
    sku_name TEXT NOT NULL,
    main_image TEXT,
    price DECIMAL(10, 2) NOT NULL,
    quantity INT CHECK (quantity >= 1),
    subtotal DECIMAL(10, 2) NOT NULL,
    remark TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

COMMENT ON TABLE order_items IS '订单明细表，存储下单时的快照数据';
COMMENT ON COLUMN order_items.product_name IS '下单时的商品名称快照';
COMMENT ON COLUMN order_items.price IS '下单时的单价快照';
COMMENT ON COLUMN order_items.subtotal IS '小计金额 = price * quantity';

-- ============================================================
-- 8. addresses - 收货地址表
-- ============================================================
CREATE TABLE addresses (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    recipient_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    province TEXT NOT NULL,
    city TEXT NOT NULL,
    district TEXT NOT NULL,
    detail TEXT NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_addresses_user_id ON addresses(user_id);
CREATE INDEX idx_addresses_is_default ON addresses(user_id, is_default);

COMMENT ON TABLE addresses IS '收货地址表';
COMMENT ON COLUMN addresses.detail IS '详细地址';
COMMENT ON COLUMN addresses.is_default IS '是否默认地址';

-- ============================================================
-- 9. banners - 轮播图表
-- ============================================================
CREATE TABLE banners (
    id BIGSERIAL PRIMARY KEY,
    image_url TEXT NOT NULL,
    link_url TEXT NOT NULL DEFAULT '',
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_banners_is_active ON banners(is_active);
CREATE INDEX idx_banners_sort_order ON banners(sort_order);

COMMENT ON TABLE banners IS '首页轮播图表';
COMMENT ON COLUMN banners.link_url IS '点击跳转链接';
COMMENT ON COLUMN banners.is_active IS '是否启用';

-- ============================================================
-- 10. quick_icons - 快捷入口表
-- ============================================================
CREATE TABLE quick_icons (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    icon_url TEXT NOT NULL DEFAULT '',
    link_url TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quick_icons_is_active ON quick_icons(is_active);
CREATE INDEX idx_quick_icons_sort_order ON quick_icons(sort_order);

COMMENT ON TABLE quick_icons IS '首页快捷入口表';
COMMENT ON COLUMN quick_icons.icon_url IS '图标URL';
COMMENT ON COLUMN quick_icons.link_url IS '点击跳转链接';

-- ============================================================
-- 11. home_products - 首页推荐商品表
-- ============================================================
CREATE TABLE home_products (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 同一商品只推荐一次
CREATE UNIQUE INDEX idx_home_products_product_id ON home_products(product_id);
CREATE INDEX idx_home_products_sort_order ON home_products(sort_order);

COMMENT ON TABLE home_products IS '首页推荐商品表';

-- ============================================================
-- 12. system_settings - 系统设置表
-- ============================================================
CREATE TABLE system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE system_settings IS '系统设置表，键值对形式';

-- ============================================================
-- 通用函数：自动更新 updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为需要 updated_at 自动更新的表创建触发器
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'profiles', 'categories', 'products', 'product_skus',
        'cart', 'orders', 'addresses', 'banners', 'quick_icons',
        'system_settings'
    ]
    LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_%s_updated_at
             BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
            t, t
        );
    END LOOP;
END;
$$;

-- ============================================================
-- 函数：生成订单编号
-- 格式：YYYYMMDDHH24MISS + 6位随机数
-- ============================================================
CREATE OR REPLACE FUNCTION generate_order_no()
RETURNS TEXT AS $$
BEGIN
    RETURN TO_CHAR(NOW(), 'YYYYMMDDHH24MISS') || LPAD(FLOOR(RANDOM() * 1000000)::INT::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_order_no() IS '生成订单编号：时间戳 + 6位随机数';

-- ============================================================
-- 函数：生成商品编号
-- 格式：P + 自增序号，起始值 10001
-- ============================================================
CREATE OR REPLACE FUNCTION generate_product_no()
RETURNS TEXT AS $$
DECLARE
    max_no INT;
BEGIN
    -- 获取当前最大商品编号，若无记录则从 10001 开始
    SELECT COALESCE(
        MAX(NULLIF(REGEXP_REPLACE(product_no, '[^0-9]', '', 'g'), '')::INT),
        10000
    ) INTO max_no
    FROM products;

    RETURN 'P' || (max_no + 1)::TEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_product_no() IS '生成商品编号：P + 自增序号，起始 10001';
