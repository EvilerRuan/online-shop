# 零售商城 — API 接口文档

## 1. 全局规范

### 1.1 基础信息

| 项目 | 说明 |
|------|------|
| Base URL | `https://<worker-name>.<account>.workers.dev` |
| 协议 | HTTPS |
| 数据格式 | JSON |
| 编码 | UTF-8 |
| 认证方式 | Bearer Token（自签发 JWT，非 Supabase Auth） |

### 1.2 统一响应格式

**成功响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

**分页响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [],
    "total": 100,
    "page": 1,
    "page_size": 20
  }
}
```

**错误响应：**
```json
{
  "code": 401,
  "message": "未登录"
}
```

### 1.3 错误码定义

| code | 说明 |
|------|------|
| 0 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未登录 / Token 无效 |
| 403 | 无权限（非管理员 / 非零售用户） |
| 404 | 资源不存在 |
| 409 | 业务冲突（如库存不足、积分不足、重复操作） |
| 500 | 服务器内部错误 |

### 1.4 认证方式

零售端使用自签发 JWT（区别于批发端的 Supabase Auth Token）。

请求头携带 Token：
```
Authorization: Bearer <jwt_token>
```

**JWT Payload 结构：**
```json
{
  "sub": "user_uuid",
  "channel": "retail",
  "iat": 1234567890,
  "exp": 1234567890
}
```

- JWT 有效期：30 天
- 到期后需重新登录
- `retailAuthMiddleware` 额外校验 `channel === 'retail'`

---

## 2. 认证模块（扩展）

> 以下三个接口为公开路由，无需认证。在现有 `/api/auth/*` 路由基础上扩展。

### 2.1 微信登录

#### POST /api/auth/wx-login — 微信小程序登录

仅在微信小程序环境（`weapp`）下使用。

**请求体：**
```json
{
  "code": "wx_login_code_from_wx_login"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| code | string | 是 | 微信小程序 `wx.login()` 获取的临时 code |

**业务逻辑：**
1. 调用微信 `code2session` 接口，传入 `appid` + `secret` + `code`，获取 `openid` / `unionid`
2. 通过 `openid` 查询 `profiles` 表
3. 用户已存在 → 直接签发 JWT
4. 用户不存在 → 创建 `profiles` 记录（`channel = 'retail'`）→ 调用 `add_points` RPC 赠送注册积分（`reason = 'register'`）→ 签发 JWT
5. 返回 Token 和用户信息

**成功响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "username": "微信用户",
      "phone": null,
      "avatar_url": "",
      "points_balance": 100,
      "channel": "retail"
    }
  }
}
```

**错误场景：**

| 场景 | code | message |
|------|------|---------|
| code 为空 | 400 | code 不能为空 |
| 微信 code2session 失败 | 500 | 微信登录失败，请重试 |
| 账号被禁用 | 403 | 账号已被禁用 |

---

### 2.2 发送验证码

#### POST /api/auth/send-code — 发送短信验证码

**请求体：**
```json
{
  "phone": "13800000000"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| phone | string | 是 | 手机号（11 位） |

**业务逻辑：**
- 模拟发送验证码，验证码固定为 `123456`
- 实际生产环境替换为真实短信服务

**成功响应：**
```json
{
  "code": 0,
  "message": "验证码已发送",
  "data": null
}
```

**错误场景：**

| 场景 | code | message |
|------|------|---------|
| 手机号格式错误 | 400 | 手机号格式不正确 |

---

### 2.3 验证码登录

#### POST /api/auth/sms-login — 手机号验证码登录

**请求体：**
```json
{
  "phone": "13800000000",
  "code": "123456"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| phone | string | 是 | 手机号（11 位） |
| code | string | 是 | 短信验证码 |

**业务逻辑：**
1. 校验验证码是否正确（模拟环境固定 `123456`）
2. 通过 `phone` 查询 `profiles` 表（`channel = 'retail'`）
3. 用户已存在 → 直接签发 JWT
4. 用户不存在 → 创建 `profiles` 记录（`channel = 'retail'`）→ 调用 `add_points` RPC 赠送注册积分（`reason = 'register'`）→ 签发 JWT
5. 返回 Token 和用户信息

**成功响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "username": "用户800000",
      "phone": "13800000000",
      "avatar_url": "",
      "points_balance": 100,
      "channel": "retail"
    }
  }
}
```

**错误场景：**

| 场景 | code | message |
|------|------|---------|
| 手机号格式错误 | 400 | 手机号格式不正确 |
| 验证码错误 | 400 | 验证码错误 |
| 账号被禁用 | 403 | 账号已被禁用 |

---

## 3. 零售端公开路由（无需认证）

> 以下接口无需 Token 即可访问，用于展示商品等公开信息。

### 3.1 首页数据

#### GET /api/retail/home — 获取零售首页数据

一次性获取轮播图、金刚区、热销推荐商品。

**成功响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "banners": [
      {
        "id": 1,
        "image_url": "https://...",
        "title": "限时特惠",
        "link_url": "/pages/product-detail/index?id=123"
      }
    ],
    "quick_icons": [
      {
        "id": 1,
        "name": "新品上架",
        "icon_url": "https://...",
        "link_url": "/pages/product-list/index?tag=new"
      }
    ],
    "hot_products": [
      {
        "id": 1,
        "name": "商品名称",
        "main_image": "https://...",
        "retail_price": 9.90,
        "sales_count": 100
      }
    ]
  }
}
```

**数据来源：**
- `banners` → `retail_banners` 表，`is_active = true`，按 `sort_order` 升序
- `quick_icons` → `retail_quick_icons` 表，`is_active = true`，按 `sort_order` 升序
- `hot_products` → `retail_home_products` 关联表 JOIN `products`，按 `sort_order` 升序

---

### 3.2 商品列表

#### GET /api/retail/products — 零售商品列表

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| category_id | number | 否 | 分类 ID 筛选 |
| keyword | string | 否 | 搜索关键词（名称 / 条码） |
| sort | string | 否 | 排序：`default`(综合) / `price_asc`(价格升序) / `price_desc`(价格降序) / `sales_desc`(销量降序)，默认 `default` |
| page | number | 否 | 页码，默认 1 |
| page_size | number | 否 | 每页数量，默认 20 |

**筛选条件：**
- `sales_channel IN ('retail', 'both')` — 仅零售或双渠道商品
- `status = 'active'` — 仅上架商品

**成功响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": 1,
        "name": "商品名称",
        "main_image": "https://...",
        "retail_price": 9.90,
        "sales_count": 100
      }
    ],
    "total": 50,
    "page": 1,
    "page_size": 20
  }
}
```

---

### 3.3 商品详情

#### GET /api/retail/products/:id — 零售商品详情

**路径参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | number | 商品 ID |

**成功响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 1,
    "name": "商品名称",
    "product_no": "P10001",
    "barcode": "6901234567890",
    "main_image": "https://...",
    "description": "<p>富文本详情</p>",
    "retail_price": 9.90,
    "sales_count": 100,
    "category": {
      "id": 1,
      "name": "分类名称"
    },
    "skus": [
      {
        "id": 1,
        "sku_name": "个",
        "price": 9.90,
        "stock": 500
      },
      {
        "id": 2,
        "sku_name": "包",
        "price": 89.00,
        "stock": 200
      }
    ]
  }
}
```

**错误场景：**

| 场景 | code | message |
|------|------|---------|
| 商品不存在 | 404 | 商品不存在 |
| 商品已下架 | 404 | 商品不存在 |
| 非零售渠道商品 | 404 | 商品不存在 |

---

## 4. 零售端认证路由（retailAuthMiddleware）

> 以下所有接口需要携带有效的零售端 JWT Token。

### 4.1 运费计算

#### GET /api/retail/shipping/calculate — 运费计算

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| province | string | 是 | 省份 |
| city | string | 否 | 城市 |
| order_amount | number | 是 | 订单商品金额（不含运费） |

**业务逻辑：**
1. 精确匹配：`province + city`（city 不为空）→ 命中则使用
2. 省级匹配：`province + city=''` → 命中则使用
3. 默认运费：`system_settings.default_shipping_fee` → 兜底

运费类型处理：
- `fee_type = 'free'` → 运费 = 0
- `fee_type = 'fixed'` → 运费 = `base_fee`
- `fee_type = 'free_threshold'` → 订单金额 >= `free_threshold` 则运费 = 0，否则运费 = `base_fee`

**成功响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "shipping_fee": 8.00,
    "free_threshold": 99.00,
    "is_free": false
  }
}
```

**字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| shipping_fee | number | 实际运费金额 |
| free_threshold | number | 免运费阈值，无则为 0 |
| is_free | boolean | 是否包邮（含满足免运费条件） |

---

### 4.2 订单模块

#### POST /api/retail/orders — 创建零售订单

**请求体：**
```json
{
  "address_id": 1,
  "items": [
    {
      "product_id": 1,
      "sku_id": 1,
      "quantity": 2
    },
    {
      "product_id": 3,
      "sku_id": 5,
      "quantity": 1
    }
  ],
  "remark": "请尽快发货"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| address_id | number | 是 | 收货地址 ID |
| items | array | 是 | 商品列表 |
| items[].product_id | number | 是 | 商品 ID |
| items[].sku_id | number | 是 | SKU ID |
| items[].quantity | number | 是 | 购买数量（最少 1 件） |
| remark | string | 否 | 订单备注 |

**业务逻辑（事务）：**
1. 校验收货地址存在且属于当前用户
2. 校验所有商品为零售渠道（`sales_channel IN ('retail', 'both')`）且状态为 `active`
3. 计算商品总金额（使用 `retail_price`）
4. 计算运费（调用运费计算逻辑）
5. 校验所有 SKU 库存充足
6. 扣减 SKU 库存
7. 创建 `orders` 记录（`channel = 'retail'`, `status = 'pending_shipment'`, `shipping_fee`）
8. 创建 `order_items` 记录（快照商品名称、图片、价格等）
9. 更新商品销量（`sales_count`）
10. 清空本地购物车中已结算的商品（通过前端本地存储处理）

**成功响应：**
```json
{
  "code": 0,
  "message": "订单已提交",
  "data": {
    "order_id": 1,
    "order_no": "R20260609143000123456",
    "total_amount": 27.80,
    "shipping_fee": 8.00
  }
}
```

**错误场景：**

| 场景 | code | message |
|------|------|---------|
| 收货地址不存在 | 404 | 收货地址不存在 |
| 商品不存在或已下架 | 404 | 商品不存在 |
| 库存不足 | 409 | "xxx" 商品库存不足 |
| 商品列表为空 | 400 | 商品列表不能为空 |
| 数量不合法 | 400 | 商品数量必须大于 0 |

---

#### GET /api/retail/orders — 零售订单列表

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | 否 | 状态筛选：`all` / `pending_shipment` / `pending_receipt` / `completed` / `cancelled`，默认 `all` |
| page | number | 否 | 页码，默认 1 |
| page_size | number | 否 | 每页数量，默认 20 |

**筛选条件：**
- `channel = 'retail'` — 仅零售订单
- `user_id = 当前用户 ID`

**成功响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": 1,
        "order_no": "R20260609143000123456",
        "total_amount": 27.80,
        "shipping_fee": 8.00,
        "status": "pending_shipment",
        "status_text": "待发货",
        "item_count": 2,
        "product_images": ["url1", "url2"],
        "created_at": "2026-06-09T14:30:00Z"
      }
    ],
    "total": 10,
    "page": 1,
    "page_size": 20
  }
}
```

**字段说明：**

| 字段 | 数据来源 | 说明 |
|------|---------|------|
| `product_images` | 从 `order_items` 表取前 3 个商品的 `main_image` | 商品缩略图数组，最多 3 张 |

---

#### GET /api/retail/orders/count — 订单状态计数

用于个人中心显示角标。

**筛选条件：**
- `channel = 'retail'` AND `user_id = 当前用户 ID`

**成功响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "pending_shipment": 1,
    "pending_receipt": 3,
    "completed": 5
  }
}
```

---

#### GET /api/retail/orders/:id — 零售订单详情

**路径参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | number | 订单 ID |

**成功响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 1,
    "order_no": "R20260609143000123456",
    "status": "pending_receipt",
    "status_text": "待收货",
    "total_amount": 27.80,
    "shipping_fee": 8.00,
    "remark": "请尽快发货",
    "shipping_no": "SF1234567890",
    "recipient": {
      "name": "张三",
      "phone": "13800000000",
      "address": "广东省深圳市南山区xxx街道"
    },
    "items": [
      {
        "id": 1,
        "product_id": 1,
        "product_name": "商品A",
        "sku_name": "个",
        "main_image": "https://...",
        "price": 9.90,
        "quantity": 2,
        "subtotal": 19.80
      }
    ],
    "created_at": "2026-06-09T14:30:00Z"
  }
}
```

**错误场景：**

| 场景 | code | message |
|------|------|---------|
| 订单不存在 | 404 | 订单不存在 |
| 订单不属于当前用户 | 404 | 订单不存在 |

---

#### POST /api/retail/orders/:id/cancel — 取消订单

**前置条件：** 订单状态为 `pending_shipment`（待发货）

**业务逻辑（事务）：**
1. 更新订单状态 → `cancelled`
2. 恢复所有 SKU 库存

**成功响应：**
```json
{
  "code": 0,
  "message": "订单已取消",
  "data": null
}
```

**错误场景：**

| 场景 | code | message |
|------|------|---------|
| 订单不存在 | 404 | 订单不存在 |
| 订单状态不允许取消 | 409 | 当前订单状态不允许取消 |

---

#### POST /api/retail/orders/:id/confirm — 确认收货

**前置条件：** 订单状态为 `pending_receipt`（待收货）

**业务逻辑：**
1. 更新订单状态 → `completed`
2. 检查该用户是否为首次确认收货（查询 `points_ledger` 中是否已有 `reason = 'first_purchase'` 的记录）
3. 首次确认收货 → 调用 `add_points` RPC 赠送首次购买积分（`reason = 'first_purchase'`）

**成功响应：**
```json
{
  "code": 0,
  "message": "已确认收货",
  "data": {
    "points_awarded": 100
  }
}
```

**字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| points_awarded | number | 本次获得的积分，非首次收货为 0 |

**错误场景：**

| 场景 | code | message |
|------|------|---------|
| 订单不存在 | 404 | 订单不存在 |
| 订单状态不允许确认 | 409 | 当前订单状态不允许确认收货 |

---

### 4.3 售后模块

#### POST /api/retail/after-sales — 申请售后

**请求体：**
```json
{
  "order_id": 1,
  "order_item_id": 1,
  "type": "return_refund",
  "reason": "商品有质量问题",
  "refund_amount": 19.80,
  "evidence_images": [
    "https://...xxx1.jpg",
    "https://...xxx2.jpg"
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| order_id | number | 是 | 订单 ID |
| order_item_id | number | 是 | 订单商品 ID |
| type | string | 是 | 售后类型：`refund`(仅退款) / `return_refund`(退货退款) |
| reason | string | 是 | 申请原因 |
| refund_amount | number | 是 | 退款金额（不能超过订单商品实付金额） |
| evidence_images | string[] | 否 | 凭证图片 URL 数组，最多 6 张 |

**业务逻辑：**
1. 校验订单存在且属于当前用户
2. 校验订单商品存在且属于该订单
3. 校验该订单商品尚未申请过售后（不可重复申请）
4. 创建 `after_sales` 记录（`status = 'pending'`）

**成功响应：**
```json
{
  "code": 0,
  "message": "售后申请已提交",
  "data": {
    "id": 1
  }
}
```

**错误场景：**

| 场景 | code | message |
|------|------|---------|
| 订单不存在 | 404 | 订单不存在 |
| 订单商品不存在 | 404 | 订单商品不存在 |
| 已申请过售后 | 409 | 该商品已申请过售后 |
| 退款金额超出 | 400 | 退款金额不能超过实付金额 |

---

#### GET /api/retail/after-sales — 售后列表

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | 否 | 状态筛选：`all` / `pending` / `processing` / `approved` / `rejected` / `completed` / `closed`，默认 `all` |
| page | number | 否 | 页码，默认 1 |
| page_size | number | 否 | 每页数量，默认 20 |

**筛选条件：**
- `user_id = 当前用户 ID`

**成功响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": 1,
        "order_no": "R20260609143000123456",
        "type": "return_refund",
        "type_text": "退货退款",
        "status": "pending",
        "status_text": "待处理",
        "product_name": "商品A",
        "product_image": "https://...",
        "refund_amount": 19.80,
        "created_at": "2026-06-09T14:30:00Z"
      }
    ],
    "total": 3,
    "page": 1,
    "page_size": 20
  }
}
```

---

#### GET /api/retail/after-sales/:id — 售后详情

**路径参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | number | 售后工单 ID |

**成功响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 1,
    "order_id": 1,
    "order_no": "R20260609143000123456",
    "order_item_id": 1,
    "type": "return_refund",
    "type_text": "退货退款",
    "status": "processing",
    "status_text": "处理中",
    "reason": "商品有质量问题",
    "refund_amount": 19.80,
    "evidence_images": ["https://...xxx1.jpg"],
    "return_shipping_no": "",
    "reject_reason": "",
    "product": {
      "product_name": "商品A",
      "sku_name": "个",
      "main_image": "https://...",
      "price": 9.90,
      "quantity": 2
    },
    "created_at": "2026-06-09T14:30:00Z",
    "updated_at": "2026-06-09T15:00:00Z"
  }
}
```

**错误场景：**

| 场景 | code | message |
|------|------|---------|
| 售后单不存在 | 404 | 售后记录不存在 |
| 不属于当前用户 | 404 | 售后记录不存在 |

---

#### PUT /api/retail/after-sales/:id/return-shipping — 填写退货快递单号

**前置条件：** 售后状态为 `processing`（处理中）且售后类型为 `return_refund`（退货退款）

**请求体：**
```json
{
  "return_shipping_no": "SF9876543210"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| return_shipping_no | string | 是 | 退货快递单号 |

**成功响应：**
```json
{
  "code": 0,
  "message": "退货快递单号已提交",
  "data": null
}
```

**错误场景：**

| 场景 | code | message |
|------|------|---------|
| 售后单不存在 | 404 | 售后记录不存在 |
| 状态不允许填写 | 409 | 当前状态不允许填写退货快递单号 |
| 快递单号为空 | 400 | 退货快递单号不能为空 |

---

### 4.4 积分模块

#### GET /api/retail/points/balance — 积分余额

**成功响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "points_balance": 350
  }
}
```

---

#### GET /api/retail/points/ledger — 积分流水

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认 1 |
| page_size | number | 否 | 每页数量，默认 20 |

**筛选条件：**
- `user_id = 当前用户 ID`
- 按 `created_at` 降序排列

**成功响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": 1,
        "type": "earn",
        "type_text": "获得",
        "reason": "register",
        "reason_text": "注册奖励",
        "amount": 100,
        "balance_after": 100,
        "remark": "",
        "created_at": "2026-06-09T10:00:00Z"
      },
      {
        "id": 2,
        "type": "spend",
        "type_text": "消耗",
        "reason": "redeem",
        "reason_text": "积分兑换",
        "amount": 50,
        "balance_after": 50,
        "remark": "兑换商品：马克杯",
        "created_at": "2026-06-09T12:00:00Z"
      }
    ],
    "total": 10,
    "page": 1,
    "page_size": 20
  }
}
```

**reason_text 映射：**

| reason | reason_text |
|--------|-------------|
| register | 注册奖励 |
| referral | 推荐奖励 |
| first_purchase | 首次购买奖励 |
| redeem | 积分兑换 |
| admin_adjust | 管理员调整 |

---

#### GET /api/retail/points/products — 积分商品列表

**筛选条件：**
- `is_active = true`
- 按 `created_at` 降序排列

**成功响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": 1,
        "name": "马克杯",
        "image": "https://...",
        "points_cost": 200,
        "stock": 50
      }
    ],
    "total": 5,
    "page": 1,
    "page_size": 20
  }
}
```

---

#### GET /api/retail/points/products/:id — 积分商品详情

**路径参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | number | 积分商品 ID |

**成功响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 1,
    "name": "马克杯",
    "image": "https://...",
    "points_cost": 200,
    "stock": 50,
    "is_active": true
  }
}
```

**错误场景：**

| 场景 | code | message |
|------|------|---------|
| 积分商品不存在 | 404 | 积分商品不存在 |

---

#### POST /api/retail/points/redeem — 积分兑换

**请求体：**
```json
{
  "points_product_id": 1
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| points_product_id | number | 是 | 积分商品 ID |

**业务逻辑（事务）：**
1. 查询积分商品（校验存在且 `is_active = true` 且 `stock > 0`）
2. 查询用户积分余额
3. 校验积分余额 >= `points_cost`
4. 调用 `spend_points` RPC（`reason = 'redeem'`）扣减积分
5. 创建 `points_redeem_orders` 记录（快照商品名称和图片，`status = 'pending'`）
6. 扣减积分商品库存

**成功响应：**
```json
{
  "code": 0,
  "message": "兑换成功",
  "data": {
    "redeem_order_id": 1,
    "points_used": 200,
    "points_balance_after": 150
  }
}
```

**错误场景：**

| 场景 | code | message |
|------|------|---------|
| 积分商品不存在 | 404 | 积分商品不存在 |
| 积分商品已下架 | 404 | 积分商品不存在 |
| 库存不足 | 409 | 积分商品库存不足 |
| 积分不足 | 409 | 积分余额不足 |

---

### 4.5 个人资料

#### PUT /api/retail/profile — 更新用户资料

**请求体：**
```json
{
  "username": "新昵称",
  "avatar_url": "https://..."
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | 否 | 用户昵称 |
| avatar_url | string | 否 | 头像 URL |

**成功响应：**
```json
{
  "code": 0,
  "message": "更新成功",
  "data": null
}
```

---

### 4.6 客服消息

#### POST /api/retail/messages — 发送客服消息

**请求体：**
```json
{
  "content": "你好，我想咨询一下订单问题",
  "message_type": "text"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| content | string | 是 | 消息内容（文字或图片 URL） |
| message_type | string | 否 | 消息类型：`text`(文字) / `image`(图片)，默认 `text` |

**业务逻辑：**
1. 创建 `customer_messages` 记录（`sender_type = 'user'`, `is_read = false`）
2. 读取系统设置 `customer_service_auto_reply`，若有值则自动插入一条管理员回复消息

**成功响应：**
```json
{
  "code": 0,
  "message": "发送成功",
  "data": {
    "id": 1
  }
}
```

---

#### GET /api/retail/messages — 消息列表

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认 1 |
| page_size | number | 否 | 每页数量，默认 20 |

**筛选条件：**
- `user_id = 当前用户 ID`
- 按 `created_at` 升序排列

**业务逻辑：**
- 查询时将管理员发送的未读消息标记为已读（`is_read = true`）

**成功响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": 1,
        "sender_type": "user",
        "content": "你好，我想咨询一下订单问题",
        "message_type": "text",
        "created_at": "2026-06-09T14:30:00Z"
      },
      {
        "id": 2,
        "sender_type": "admin",
        "content": "您好，客服正在为您处理，请稍候。",
        "message_type": "text",
        "created_at": "2026-06-09T14:30:01Z"
      }
    ],
    "total": 10,
    "page": 1,
    "page_size": 20
  }
}
```

---

### 4.7 推荐模块

#### GET /api/retail/referral/info — 推荐信息

**成功响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "referral_code": "uuid_of_current_user",
    "points_balance": 350
  }
}
```

**字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| referral_code | string | 当前用户的推荐码（即用户 ID），用于生成分享链接 |
| points_balance | number | 当前积分余额 |

---

#### GET /api/retail/referral/history — 推荐历史

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认 1 |
| page_size | number | 否 | 每页数量，默认 20 |

**筛选条件：**
- `referrer_id = 当前用户 ID`
- 按 `created_at` 降序排列

**成功响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": 1,
        "referred_username": "用户A",
        "referred_avatar_url": "https://...",
        "points_awarded": 200,
        "created_at": "2026-06-08T10:00:00Z"
      }
    ],
    "total": 5,
    "page": 1,
    "page_size": 20
  }
}
```

---

## 5. 管理后台路由（adminMiddleware 扩展）

> 所有 `/api/admin/*` 接口需要 admin 权限。在现有管理后台路由基础上扩展。

### 5.1 Dashboard 扩展

#### GET /api/admin/dashboard — 仪表盘数据（扩展）

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| channel | string | 否 | 渠道筛选：`all` / `wholesale` / `retail`，默认 `all` |

**业务逻辑：**
- 当 `channel = 'retail'` 时，仅统计零售端数据（`orders.channel = 'retail'`, `profiles.channel = 'retail'`）
- 当 `channel = 'wholesale'` 时，仅统计批发端数据
- 当 `channel = 'all'` 时，统计全部数据

**成功响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "user_count": 128,
    "product_count": 356,
    "order_count": 1024,
    "today_order_amount": 5680.00,
    "retail_user_count": 50,
    "retail_order_count": 200,
    "today_retail_order_amount": 1280.00,
    "after_sales_pending_count": 3,
    "recent_orders": [
      {
        "id": 100,
        "order_no": "R20260609143000123456",
        "user_phone": "13800000000",
        "total_amount": 27.80,
        "channel": "retail",
        "status": "pending_shipment",
        "status_text": "待发货",
        "created_at": "2026-06-09T14:30:00Z"
      }
    ]
  }
}
```

---

### 5.2 运费管理

#### GET /api/admin/shipping-fees — 运费配置列表

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| province | string | 否 | 省份筛选 |
| is_active | boolean | 否 | 启用状态筛选 |
| page | number | 否 | 页码，默认 1 |
| page_size | number | 否 | 每页数量，默认 20 |

**成功响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": 1,
        "province": "广东省",
        "city": "深圳市",
        "fee_type": "free_threshold",
        "base_fee": 8.00,
        "free_threshold": 99.00,
        "is_active": true,
        "created_at": "2026-06-01T10:00:00Z",
        "updated_at": "2026-06-01T10:00:00Z"
      }
    ],
    "total": 30,
    "page": 1,
    "page_size": 20
  }
}
```

---

#### POST /api/admin/shipping-fees — 新增运费配置

**请求体：**
```json
{
  "province": "广东省",
  "city": "深圳市",
  "fee_type": "free_threshold",
  "base_fee": 8.00,
  "free_threshold": 99.00
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| province | string | 是 | 省份 |
| city | string | 否 | 城市，空字符串表示该省所有城市 |
| fee_type | string | 是 | 运费类型：`fixed`(固定运费) / `free_threshold`(满额免运费) / `free`(包邮) |
| base_fee | number | 否 | 基础运费（`fee_type = 'free'` 时忽略） |
| free_threshold | number | 否 | 免运费阈值（仅 `fee_type = 'free_threshold'` 时使用） |

**成功响应：**
```json
{
  "code": 0,
  "message": "创建成功",
  "data": { "id": 1 }
}
```

**错误场景：**

| 场景 | code | message |
|------|------|---------|
| 重复配置 | 409 | 该城市运费配置已存在 |

---

#### PUT /api/admin/shipping-fees/:id — 编辑运费配置

**请求体：** 同新增运费配置。

**成功响应：**
```json
{
  "code": 0,
  "message": "更新成功",
  "data": null
}
```

---

#### DELETE /api/admin/shipping-fees/:id — 删除运费配置

**成功响应：**
```json
{
  "code": 0,
  "message": "删除成功",
  "data": null
}
```

---

### 5.3 积分规则管理

#### GET /api/admin/points-config — 获取积分规则配置

**成功响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "register_points": 100,
    "referral_points": 200,
    "first_purchase_points": 100
  }
}
```

**字段说明：**

| 字段 | 说明 |
|------|------|
| register_points | 注册赠送积分 |
| referral_points | 推荐新人赠送积分（给推荐人） |
| first_purchase_points | 首次确认收货赠送积分 |

---

#### PUT /api/admin/points-config — 更新积分规则配置

**请求体：**
```json
{
  "register_points": 100,
  "referral_points": 200,
  "first_purchase_points": 100
}
```

**成功响应：**
```json
{
  "code": 0,
  "message": "更新成功",
  "data": null
}
```

---

### 5.4 积分商品管理

#### GET /api/admin/points-products — 积分商品列表

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 否 | 商品名称模糊搜索 |
| is_active | boolean | 否 | 启用状态筛选 |
| page | number | 否 | 页码，默认 1 |
| page_size | number | 否 | 每页数量，默认 20 |

**成功响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": 1,
        "name": "马克杯",
        "image": "https://...",
        "points_cost": 200,
        "stock": 50,
        "is_active": true,
        "redeem_count": 10,
        "created_at": "2026-06-01T10:00:00Z"
      }
    ],
    "total": 5,
    "page": 1,
    "page_size": 20
  }
}
```

---

#### POST /api/admin/points-products — 新增积分商品

**请求体：**
```json
{
  "name": "马克杯",
  "image": "https://...",
  "points_cost": 200,
  "stock": 100
}
```

**成功响应：**
```json
{
  "code": 0,
  "message": "创建成功",
  "data": { "id": 1 }
}
```

---

#### PUT /api/admin/points-products/:id — 编辑积分商品

**请求体：** 同新增积分商品。

**成功响应：**
```json
{
  "code": 0,
  "message": "更新成功",
  "data": null
}
```

---

#### DELETE /api/admin/points-products/:id — 删除积分商品

**限制条件：** 无关联兑换订单时才可删除。

**成功响应：**
```json
{
  "code": 0,
  "message": "删除成功",
  "data": null
}
```

---

#### GET /api/admin/points-products/redeem — 兑换记录列表

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| user_phone | string | 否 | 用户手机号搜索 |
| status | string | 否 | 状态筛选：`pending` / `shipped` / `completed` / `cancelled` |
| page | number | 否 | 页码，默认 1 |
| page_size | number | 否 | 每页数量，默认 20 |

**成功响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": 1,
        "user_id": "uuid",
        "user_phone": "13800000000",
        "user_username": "用户A",
        "product_name": "马克杯",
        "product_image": "https://...",
        "points_used": 200,
        "status": "pending",
        "status_text": "待发货",
        "created_at": "2026-06-09T14:30:00Z"
      }
    ],
    "total": 20,
    "page": 1,
    "page_size": 20
  }
}
```

---

#### PATCH /api/admin/points-products/redeem/:id/ship — 积分兑换订单发货

**前置条件：** 兑换订单状态为 `pending`（待发货）

**请求体：**
```json
{
  "shipping_no": "SF1234567890"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| shipping_no | string | 否 | 物流单号（可为空，表示无需物流） |

**业务逻辑：**
- 更新 `points_redeem_orders` 状态 → `shipped`

**成功响应：**
```json
{
  "code": 0,
  "message": "发货成功",
  "data": null
}
```

**错误场景：**

| 场景 | code | message |
|------|------|---------|
| 订单不存在 | 404 | 兑换记录不存在 |
| 状态不允许发货 | 409 | 当前状态不允许发货 |

---

### 5.5 积分流水管理

#### GET /api/admin/points-ledger — 积分流水列表

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| user_phone | string | 否 | 用户手机号搜索 |
| type | string | 否 | 类型筛选：`earn` / `spend` |
| reason | string | 否 | 原因筛选：`register` / `referral` / `first_purchase` / `redeem` / `admin_adjust` |
| page | number | 否 | 页码，默认 1 |
| page_size | number | 否 | 每页数量，默认 20 |

**成功响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": 1,
        "user_id": "uuid",
        "user_phone": "13800000000",
        "user_username": "用户A",
        "type": "earn",
        "type_text": "获得",
        "reason": "register",
        "reason_text": "注册奖励",
        "amount": 100,
        "balance_after": 100,
        "remark": "",
        "created_at": "2026-06-09T10:00:00Z"
      }
    ],
    "total": 500,
    "page": 1,
    "page_size": 20
  }
}
```

---

### 5.6 售后管理

#### GET /api/admin/after-sales — 售后工单列表

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| order_no | string | 否 | 订单号搜索 |
| user_phone | string | 否 | 用户手机号搜索 |
| type | string | 否 | 售后类型筛选：`refund` / `return_refund` |
| status | string | 否 | 状态筛选：`pending` / `processing` / `approved` / `rejected` / `completed` / `closed` |
| page | number | 否 | 页码，默认 1 |
| page_size | number | 否 | 每页数量，默认 20 |

**成功响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": 1,
        "order_id": 1,
        "order_no": "R20260609143000123456",
        "user_phone": "13800000000",
        "user_username": "用户A",
        "type": "return_refund",
        "type_text": "退货退款",
        "status": "pending",
        "status_text": "待处理",
        "product_name": "商品A",
        "product_image": "https://...",
        "reason": "商品有质量问题",
        "refund_amount": 19.80,
        "evidence_images": ["https://...xxx1.jpg"],
        "return_shipping_no": "",
        "reject_reason": "",
        "created_at": "2026-06-09T14:30:00Z"
      }
    ],
    "total": 10,
    "page": 1,
    "page_size": 20
  }
}
```

---

#### GET /api/admin/after-sales/:id — 售后工单详情

**成功响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 1,
    "order_id": 1,
    "order_no": "R20260609143000123456",
    "order_item_id": 1,
    "user_id": "uuid",
    "user_phone": "13800000000",
    "user_username": "用户A",
    "type": "return_refund",
    "type_text": "退货退款",
    "status": "pending",
    "status_text": "待处理",
    "reason": "商品有质量问题",
    "refund_amount": 19.80,
    "evidence_images": ["https://...xxx1.jpg"],
    "return_shipping_no": "",
    "reject_reason": "",
    "product": {
      "product_name": "商品A",
      "sku_name": "个",
      "main_image": "https://...",
      "price": 9.90,
      "quantity": 2
    },
    "created_at": "2026-06-09T14:30:00Z",
    "updated_at": "2026-06-09T14:30:00Z"
  }
}
```

---

#### POST /api/admin/after-sales/:id/approve — 同意售后

**业务逻辑：**

根据售后类型执行不同操作：
- **仅退款（`refund`）**：状态 `pending` → `approved`
- **退货退款（`return_refund`）**：状态 `pending` → `processing`（等待用户填写退货快递单号）

**成功响应：**
```json
{
  "code": 0,
  "message": "已同意售后",
  "data": null
}
```

**错误场景：**

| 场景 | code | message |
|------|------|---------|
| 售后单不存在 | 404 | 售后记录不存在 |
| 状态不允许操作 | 409 | 当前状态不允许同意售后 |

---

#### POST /api/admin/after-sales/:id/reject — 拒绝售后

**请求体：**
```json
{
  "reject_reason": "商品无质量问题，不符合退货条件"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| reject_reason | string | 是 | 拒绝原因 |

**业务逻辑：**
- 状态 → `rejected`
- 记录 `reject_reason`

**成功响应：**
```json
{
  "code": 0,
  "message": "已拒绝售后",
  "data": null
}
```

**错误场景：**

| 场景 | code | message |
|------|------|---------|
| 售后单不存在 | 404 | 售后记录不存在 |
| 状态不允许操作 | 409 | 当前状态不允许拒绝售后 |
| 拒绝原因为空 | 400 | 拒绝原因不能为空 |

---

#### POST /api/admin/after-sales/:id/confirm-return — 确认退货退款

**前置条件：** 售后类型为 `return_refund` 且状态为 `processing`（用户已填写退货快递单号）

**业务逻辑（事务）：**
1. 更新售后状态 → `completed`
2. 创建退款记录或执行退款操作（具体实现视支付方式而定）

**成功响应：**
```json
{
  "code": 0,
  "message": "退款已完成",
  "data": null
}
```

**错误场景：**

| 场景 | code | message |
|------|------|---------|
| 售后单不存在 | 404 | 售后记录不存在 |
| 状态不允许操作 | 409 | 当前状态不允许确认退货退款 |

---

### 5.7 客服消息管理

#### GET /api/admin/customer-service/users — 客服用户列表

获取有过客服消息的用户列表，按最新消息时间排序。

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| keyword | string | 否 | 用户名/手机号搜索 |
| page | number | 否 | 页码，默认 1 |
| page_size | number | 否 | 每页数量，默认 20 |

**成功响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "user_id": "uuid",
        "username": "用户A",
        "phone": "13800000000",
        "avatar_url": "https://...",
        "last_message": "你好，我想咨询一下订单问题",
        "last_message_time": "2026-06-09T14:30:00Z",
        "unread_count": 2
      }
    ],
    "total": 10,
    "page": 1,
    "page_size": 20
  }
}
```

---

#### GET /api/admin/customer-service/messages/:userId — 聊天记录

**路径参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| userId | string | 用户 ID |

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认 1 |
| page_size | number | 否 | 每页数量，默认 50 |

**业务逻辑：**
- 查询该用户的所有客服消息（`sender_type IN ('user', 'admin')`）
- 按 `created_at` 升序排列
- 查询时将用户发送的未读消息标记为已读

**成功响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": 1,
        "sender_type": "user",
        "content": "你好，我想咨询一下订单问题",
        "message_type": "text",
        "is_read": true,
        "created_at": "2026-06-09T14:30:00Z"
      },
      {
        "id": 2,
        "sender_type": "admin",
        "content": "您好，请问您的订单号是多少？",
        "message_type": "text",
        "is_read": true,
        "created_at": "2026-06-09T14:31:00Z"
      }
    ],
    "total": 10,
    "page": 1,
    "page_size": 50
  }
}
```

---

#### POST /api/admin/customer-service/messages/:userId — 发送回复

**路径参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| userId | string | 目标用户 ID |

**请求体：**
```json
{
  "content": "您的订单正在处理中，请耐心等待",
  "message_type": "text"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| content | string | 是 | 消息内容（文字或图片 URL） |
| message_type | string | 否 | 消息类型：`text`(文字) / `image`(图片)，默认 `text` |

**业务逻辑：**
- 创建 `customer_messages` 记录（`sender_type = 'admin'`, `is_read = true`）

**成功响应：**
```json
{
  "code": 0,
  "message": "发送成功",
  "data": { "id": 3 }
}
```

---

### 5.8 零售用户管理

#### GET /api/admin/retail-users — 零售用户列表

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| phone | string | 否 | 手机号搜索 |
| keyword | string | 否 | 用户名搜索 |
| page | number | 否 | 页码，默认 1 |
| page_size | number | 否 | 每页数量，默认 20 |

**筛选条件：**
- `channel = 'retail'`

**成功响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "uuid",
        "username": "用户A",
        "phone": "13800000000",
        "avatar_url": "https://...",
        "points_balance": 350,
        "order_count": 5,
        "total_spent": 280.00,
        "referrer_username": null,
        "created_at": "2026-06-01T10:00:00Z"
      }
    ],
    "total": 50,
    "page": 1,
    "page_size": 20
  }
}
```

---

#### POST /api/admin/retail-users/:id/adjust-points — 积分调整

**路径参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 用户 ID |

**请求体：**
```json
{
  "type": "add",
  "amount": 100,
  "reason": "活动补偿"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 是 | 操作类型：`add`(增加) / `deduct`(扣减) |
| amount | number | 是 | 积分数量（正整数） |
| reason | string | 是 | 调整原因 |

**业务逻辑：**
- `type = 'add'` → 调用 `add_points` RPC（`reason = 'admin_adjust'`）
- `type = 'deduct'` → 调用 `spend_points` RPC（`reason = 'admin_adjust'`）

**成功响应：**
```json
{
  "code": 0,
  "message": "积分调整成功",
  "data": {
    "points_balance_after": 450
  }
}
```

**错误场景：**

| 场景 | code | message |
|------|------|---------|
| 用户不存在 | 404 | 用户不存在 |
| 积分数量不合法 | 400 | 积分数量必须大于 0 |
| 扣减时积分不足 | 409 | 用户积分余额不足 |

---

### 5.9 零售首页配置管理

#### GET /api/admin/retail-home-config/banners — 获取零售轮播图配置

**成功响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "id": 1,
      "image_url": "https://...",
      "title": "限时特惠",
      "link_url": "/pages/product-detail/index?id=1",
      "sort_order": 1,
      "is_active": true
    }
  ]
}
```

---

#### PUT /api/admin/retail-home-config/banners — 更新零售轮播图配置

**请求体：**
```json
{
  "banners": [
    {
      "id": 1,
      "image_url": "https://...",
      "title": "限时特惠",
      "link_url": "/pages/product-detail/index?id=1",
      "sort_order": 1,
      "is_active": true
    },
    {
      "image_url": "https://...",
      "title": "新品上市",
      "link_url": "/pages/product-list/index?tag=new",
      "sort_order": 2,
      "is_active": true
    }
  ]
}
```

**业务逻辑：** 有 `id` 的更新，无 `id` 的新增，不在列表中的删除。

**成功响应：**
```json
{
  "code": 0,
  "message": "更新成功",
  "data": null
}
```

---

#### GET /api/admin/retail-home-config/quick-icons — 获取零售金刚区配置

**成功响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "id": 1,
      "name": "新品上架",
      "icon_url": "https://...",
      "link_url": "/pages/product-list/index?tag=new",
      "sort_order": 1,
      "is_active": true
    }
  ]
}
```

---

#### PUT /api/admin/retail-home-config/quick-icons — 更新零售金刚区配置

**请求体：**
```json
{
  "icons": [
    {
      "id": 1,
      "name": "新品上架",
      "icon_url": "https://...",
      "link_url": "/pages/product-list/index?tag=new",
      "sort_order": 1,
      "is_active": true
    },
    {
      "name": "热销排行",
      "icon_url": "https://...",
      "link_url": "/pages/product-list/index?sort=sales_desc",
      "sort_order": 2,
      "is_active": true
    }
  ]
}
```

**业务逻辑：** 有 `id` 的更新，无 `id` 的新增，不在列表中的删除。

**成功响应：**
```json
{
  "code": 0,
  "message": "更新成功",
  "data": null
}
```

---

#### GET /api/admin/retail-home-config/products — 获取零售推荐商品配置

**成功响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "id": 1,
      "product_id": 10,
      "product_name": "商品A",
      "product_image": "https://...",
      "retail_price": 9.90,
      "sort_order": 1
    }
  ]
}
```

---

#### PUT /api/admin/retail-home-config/products — 更新零售推荐商品

**请求体：**
```json
{
  "product_ids": [10, 20, 30, 40]
}
```

**业务逻辑：** 全量替换 `retail_home_products` 表，按数组顺序设置 `sort_order`。

**成功响应：**
```json
{
  "code": 0,
  "message": "更新成功",
  "data": null
}
```

---

## 6. 接口汇总表

### 认证模块（公开路由）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/wx-login | 微信小程序登录 |
| POST | /api/auth/send-code | 发送短信验证码 |
| POST | /api/auth/sms-login | 手机号验证码登录 |

### 零售端公开路由（无需认证）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/retail/home | 零售首页数据 |
| GET | /api/retail/products | 零售商品列表 |
| GET | /api/retail/products/:id | 零售商品详情 |

### 零售端认证路由（retailAuthMiddleware）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/retail/shipping/calculate | 运费计算 |
| POST | /api/retail/orders | 创建零售订单 |
| GET | /api/retail/orders | 零售订单列表 |
| GET | /api/retail/orders/count | 订单状态计数 |
| GET | /api/retail/orders/:id | 零售订单详情 |
| POST | /api/retail/orders/:id/cancel | 取消订单 |
| POST | /api/retail/orders/:id/confirm | 确认收货 |
| POST | /api/retail/after-sales | 申请售后 |
| GET | /api/retail/after-sales | 售后列表 |
| GET | /api/retail/after-sales/:id | 售后详情 |
| PUT | /api/retail/after-sales/:id/return-shipping | 填写退货快递单号 |
| GET | /api/retail/points/balance | 积分余额 |
| GET | /api/retail/points/ledger | 积分流水 |
| GET | /api/retail/points/products | 积分商品列表 |
| GET | /api/retail/points/products/:id | 积分商品详情 |
| POST | /api/retail/points/redeem | 积分兑换 |
| PUT | /api/retail/profile | 更新用户资料 |
| POST | /api/retail/messages | 发送客服消息 |
| GET | /api/retail/messages | 消息列表 |
| GET | /api/retail/referral/info | 推荐信息 |
| GET | /api/retail/referral/history | 推荐历史 |

### 管理后台扩展路由（adminMiddleware）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/admin/dashboard | 仪表盘数据（扩展 channel 参数） |
| GET | /api/admin/shipping-fees | 运费配置列表 |
| POST | /api/admin/shipping-fees | 新增运费配置 |
| PUT | /api/admin/shipping-fees/:id | 编辑运费配置 |
| DELETE | /api/admin/shipping-fees/:id | 删除运费配置 |
| GET | /api/admin/points-config | 获取积分规则 |
| PUT | /api/admin/points-config | 更新积分规则 |
| GET | /api/admin/points-products | 积分商品列表 |
| POST | /api/admin/points-products | 新增积分商品 |
| PUT | /api/admin/points-products/:id | 编辑积分商品 |
| DELETE | /api/admin/points-products/:id | 删除积分商品 |
| GET | /api/admin/points-products/redeem | 兑换记录列表 |
| PATCH | /api/admin/points-products/redeem/:id/ship | 积分兑换发货 |
| GET | /api/admin/points-ledger | 积分流水列表 |
| GET | /api/admin/after-sales | 售后工单列表 |
| GET | /api/admin/after-sales/:id | 售后工单详情 |
| POST | /api/admin/after-sales/:id/approve | 同意售后 |
| POST | /api/admin/after-sales/:id/reject | 拒绝售后 |
| POST | /api/admin/after-sales/:id/confirm-return | 确认退货退款 |
| GET | /api/admin/customer-service/users | 客服用户列表 |
| GET | /api/admin/customer-service/messages/:userId | 聊天记录 |
| POST | /api/admin/customer-service/messages/:userId | 发送客服回复 |
| GET | /api/admin/retail-users | 零售用户列表 |
| POST | /api/admin/retail-users/:id/adjust-points | 积分调整 |
| GET | /api/admin/retail-home-config/banners | 获取零售轮播图 |
| PUT | /api/admin/retail-home-config/banners | 更新零售轮播图 |
| GET | /api/admin/retail-home-config/quick-icons | 获取零售金刚区 |
| PUT | /api/admin/retail-home-config/quick-icons | 更新零售金刚区 |
| GET | /api/admin/retail-home-config/products | 获取零售推荐商品 |
| PUT | /api/admin/retail-home-config/products | 更新零售推荐商品 |