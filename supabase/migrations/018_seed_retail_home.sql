-- ============================================================
-- 018_seed_retail_home.sql
-- 零售端首页种子数据
-- ============================================================

-- ============================================================
-- 1. retail_banners - 零售端轮播图
-- ============================================================
INSERT INTO retail_banners (image_url, title, link_url, sort_order, is_active) VALUES
    ('https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=fresh%20fruits%20and%20vegetables%20display%20in%20a%20bright%20grocery%20store%20summer%20sale%20banner%20colorful%20vibrant%20clean%20background%20commercial%20photography&image_size=landscape_16_9', '夏季鲜果特惠', '', 0, true),
    ('https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=new%20arrival%20premium%20snacks%20and%20dried%20fruits%20flat%20lay%20product%20photography%20clean%20white%20background%20commercial%20banner&image_size=landscape_16_9', '新品上市', '', 1, true),
    ('https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=limited%20time%20offer%20discount%20sale%20banner%20colorful%20shopping%20bags%20gift%20boxes%20festive%20red%20gold%20promotional%20design&image_size=landscape_16_9', '限时特惠', '', 2, true);

-- ============================================================
-- 2. retail_quick_icons - 零售端金刚区图标
-- ============================================================
INSERT INTO retail_quick_icons (name, icon_url, link_url, sort_order, is_active) VALUES
    ('新品上市', '', '/pages/product-list/index', 0, true),
    ('热卖爆款', '', '/pages/product-list/index?sort=sales', 1, true),
    ('一元专区', '', '/pages/product-list/index?category=1', 2, true),
    ('限时特惠', '', '/pages/product-list/index?sort=price', 3, true),
    ('全部分类', '', '/pages/category/index', 4, true);

-- ============================================================
-- 3. retail_home_products - 零售端首页推荐商品（动态关联已有商品）
-- ============================================================
INSERT INTO retail_home_products (product_id, sort_order)
SELECT id, ROW_NUMBER() OVER (ORDER BY sales_count DESC, id ASC) - 1
FROM products
WHERE status = 'active'
  AND sales_channel IN ('retail', 'both')
ORDER BY sales_count DESC, id ASC
LIMIT 8
ON CONFLICT (product_id) DO NOTHING;
