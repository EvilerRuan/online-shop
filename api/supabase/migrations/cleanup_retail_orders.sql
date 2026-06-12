-- 清理零售端订单脏数据（价格错误的订单）
-- 彻底清空零售端所有订单及相关数据

-- 1. 删除所有零售端订单项（先删子表）
DELETE FROM order_items
WHERE order_id IN (
  SELECT id FROM orders WHERE channel = 'retail'
);

-- 2. 删除所有零售端订单
DELETE FROM orders
WHERE channel = 'retail';

-- 3. 清空零售端购物车
DELETE FROM retail_cart;

-- 4. 清空零售端地址
DELETE FROM retail_addresses;
