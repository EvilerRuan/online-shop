-- ============================================================
-- 002_rls_policies.sql
-- 在线商城项目 - Row Level Security (RLS) 策略
-- ============================================================

-- ============================================================
-- 启用 RLS
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_skus ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_icons ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- profiles - 用户只能查看自己的资料
-- ============================================================
CREATE POLICY "profiles_select_own"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

-- ============================================================
-- categories - 所有人可查看分类
-- ============================================================
CREATE POLICY "categories_select_all"
    ON categories FOR SELECT
    USING (true);

-- ============================================================
-- products - 只能查看上架商品
-- ============================================================
CREATE POLICY "products_select_active"
    ON products FOR SELECT
    USING (status = 'active');

-- ============================================================
-- product_skus - 所有人可查看SKU
-- ============================================================
CREATE POLICY "product_skus_select_all"
    ON product_skus FOR SELECT
    USING (true);

-- ============================================================
-- cart - 用户只能操作自己的购物车
-- ============================================================
CREATE POLICY "cart_select_own"
    ON cart FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "cart_insert_own"
    ON cart FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cart_update_own"
    ON cart FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cart_delete_own"
    ON cart FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================
-- orders - 用户只能查看自己的订单
-- ============================================================
CREATE POLICY "orders_select_own"
    ON orders FOR SELECT
    USING (auth.uid() = user_id);

-- ============================================================
-- order_items - 用户只能查看自己订单的明细（通过 orders 表关联）
-- ============================================================
CREATE POLICY "order_items_select_own"
    ON order_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = order_items.order_id
            AND orders.user_id = auth.uid()
        )
    );

-- ============================================================
-- addresses - 用户只能操作自己的收货地址
-- ============================================================
CREATE POLICY "addresses_select_own"
    ON addresses FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "addresses_insert_own"
    ON addresses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "addresses_update_own"
    ON addresses FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "addresses_delete_own"
    ON addresses FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================
-- banners - 只能查看启用的轮播图
-- ============================================================
CREATE POLICY "banners_select_active"
    ON banners FOR SELECT
    USING (is_active = true);

-- ============================================================
-- quick_icons - 只能查看启用的快捷入口
-- ============================================================
CREATE POLICY "quick_icons_select_active"
    ON quick_icons FOR SELECT
    USING (is_active = true);

-- ============================================================
-- home_products - 所有人可查看推荐商品
-- ============================================================
CREATE POLICY "home_products_select_all"
    ON home_products FOR SELECT
    USING (true);

-- ============================================================
-- system_settings - 所有人可查看系统设置
-- ============================================================
CREATE POLICY "system_settings_select_all"
    ON system_settings FOR SELECT
    USING (true);
