-- ============================================================
-- 019_cleanup_retail_banners.sql
-- 清除种子数据中插入的零售端轮播图（用户已在管理后台自行配置）
-- ============================================================

DELETE FROM retail_banners WHERE image_url LIKE '%coresg-normal.trae.ai%' OR image_url LIKE '%picsum.photos%';
