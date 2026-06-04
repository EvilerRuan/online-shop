# 线上批发商城 H5 系统 — API 接口文档

## 1. 全局规范

### 1.1 基础信息

| 项目 | 说明 |
|------|------|
| Base URL | `https://<worker-name>.<account>.workers.dev` |
| 协议 | HTTPS |
| 数据格式 | JSON |
| 编码 | UTF-8 |
| 认证方式 | Bearer Token (Supabase JWT) |

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
| 403 | 无权限（非管理员） |
| 404 | 资源不存在 |
| 409 | 业务冲突（如库存不足、重复操作） |
| 500 | 服务器内部错误 |

### 1.4 认证方式

请求头携带 Token：
```
Authorization: Bearer <supabase_access_token>
```

---

## 2. 用户端 API

### 2.1 认证模块

#### POST /api/auth/login — 用户登录

**请求体：**
```json
{
  "phone": "13800000000",
  "password": "123456"
}
```

**成功响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "xxx...",
    "user": {
      "id": "uuid",
      "username": "张三",
      "phone": "13800000000",
      "role": "user"
    }
  }
}
```

**错误场景：**

| 场景 | code | message |
|------|------|---------|
| 账号不存在 | 404 | 账号不存在 |
| 密码错误 | 400 | 密码错误 |
| 账号被禁用 | 403 | 账号已被禁用 |

---

### 2.2 首页模块

#### GET /api/home — 获取首页数据

一次性获取 Banner、金刚区、热销推荐商品。

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
        "link_url": "/product/123"
      }
    ],
    "quick_icons": [
      {
        "id": 1,
        "name": "爆品",
        "icon_url": "",
        "link_url": "/products?tag=hot"
      }
    ],
    "hot_products": [
      {
        "id": 1,
        "name": "商品名称",
        "main_image": "https://...",
        "min_price": 1.00,
        "sales_count": 100
      }
    ]
  }
}
```

---

### 2.3 分类模块

#### GET /api/categories — 获取用户端分类树

仅返回 `show_in_client = true` 的分类，两级结构。

**成功响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "id": 1,
      "name": "一元区",
      "children": [
        { "id": 5, "name": "子分类A" },
        { "id": 6, "name": "子分类B" }
      ]
    },
    {
      "id": 2,
      "name": "处理区",
      "children": []
    }
  ]
}
```

---

### 2.4 商品模块

#### GET /api/products — 商品列表

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| category_id | number | 否 | 分类ID筛选 |
| keyword | string | 否 | 搜索关键词（名称/条码） |
| sort | string | 否 | 排序：`default`(综合)/`price_asc`/`price_desc`/`sales_desc` |
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
        "name": "商品名称",
        "main_image": "https://...",
        "min_price": 1.00,
        "max_price": 10.00,
        "sales_count": 100
      }
    ],
    "total": 50,
    "page": 1,
    "page_size": 20
  }
}
```

#### GET /api/products/:id — 商品详情

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
    "sales_count": 100,
    "category": {
      "id": 1,
      "name": "一元区"
    },
    "skus": [
      {
        "id": 1,
        "sku_name": "个",
        "price": 1.50,
        "stock": 500,
        "min_order_qty": 10
      },
      {
        "id": 2,
        "sku_name": "包",
        "price": 12.00,
        "stock": 200,
        "min_order_qty": 5
      }
    ]
  }
}
```

---

### 2.5 购物车模块

#### GET /api/cart — 获取购物车列表

**成功响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "id": 1,
      "product": {
        "id": 1,
        "name": "商品名称",
        "main_image": "https://..."
      },
      "sku": {
        "id": 1,
        "sku_name": "个",
        "price": 1.50,
        "stock": 500,
        "min_order_qty": 10
      },
      "quantity": 20,
      "subtotal": 30.00,
      "remark": ""
    }
  ]
}
```

#### POST /api/cart — 加入购物车

**请求体：**
```json
{
  "product_id": 1,
  "sku_id": 1,
  "quantity": 20,
  "remark": ""
}
```

**业务逻辑：**
- 同一用户 + 同一商品 + 同一规格已存在 → 累加数量（不超过库存）
- 不存在 → 新增记录

**成功响应：**
```json
{
  "code": 0,
  "message": "添加成功",
  "data": { "cart_id": 1 }
}
```

#### PUT /api/cart/:id — 修改购物车数量

**请求体：**
```json
{
  "quantity": 30
}
```

**成功响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": { "id": 1, "quantity": 30, "subtotal": 45.00 }
}
```

#### DELETE /api/cart/:id — 删除购物车商品

**成功响应：**
```json
{
  "code": 0,
  "message": "删除成功",
  "data": null
}
```

---

### 2.6 订单模块

#### POST /api/orders — 创建订单（提交订单）

**请求体：**
```json
{
  "address_id": 1,
  "cart_ids": [1, 2, 3],
  "remark": "请尽快发货"
}
```

**业务逻辑（事务）：**
1. 校验收货地址存在且属于当前用户
2. 校验购物车商品存在且属于当前用户
3. 校验所有 SKU 库存充足
4. 扣减 SKU 库存
5. 创建 orders 记录
6. 创建 order_items 记录（快照商品数据）
7. 更新商品销量
8. 清空已结算的购物车记录

**成功响应：**
```json
{
  "code": 0,
  "message": "订单已提交",
  "data": {
    "order_id": 1,
    "order_no": "20260602143000123456"
  }
}
```

**错误场景：**

| 场景 | code | message |
|------|------|---------|
| 库存不足 | 409 | "xxx" 商品库存不足 |
| 地址不存在 | 404 | 收货地址不存在 |
| 购物车为空 | 400 | 购物车为空 |

#### GET /api/orders — 订单列表

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | 否 | 状态筛选：`all`/`pending_payment`/`pending_shipment`/`pending_receipt`/`completed`/`cancelled` |
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
        "order_no": "20260602143000123456",
        "total_amount": 150.00,
        "status": "pending_payment",
        "status_text": "待付款",
        "item_count": 3,
        "product_images": ["url1", "url2", "url3"],
        "created_at": "2026-06-02T14:30:00Z"
      }
    ],
    "total": 10,
    "page": 1,
    "page_size": 20
  }
}
```

**字段说明**：

| 字段 | 数据来源 | 说明 |
|------|---------|------|
| `product_images` | 从 `order_items` 表取前 3 个商品的 `main_image` | 商品缩略图数组，最多 3 张 |

#### GET /api/orders/:id — 订单详情

**成功响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 1,
    "order_no": "20260602143000123456",
    "status": "pending_shipment",
    "status_text": "待发货",
    "total_amount": 150.00,
    "remark": "请尽快发货",
    "shipping_no": null,
    "recipient": {
      "name": "张三",
      "phone": "13800000000",
      "address": "广东省深圳市南山区xxx街道"
    },
    "items": [
      {
        "id": 1,
        "product_name": "商品A",
        "sku_name": "个",
        "main_image": "https://...",
        "price": 1.50,
        "quantity": 100,
        "subtotal": 150.00
      }
    ],
    "created_at": "2026-06-02T14:30:00Z"
  }
}
```

#### POST /api/orders/:id/cancel — 取消订单

**前置条件**：订单状态为 `pending_payment`

**业务逻辑（事务）：**
1. 更新订单状态 → `cancelled`
2. 恢复 SKU 库存

**成功响应：**
```json
{
  "code": 0,
  "message": "订单已取消",
  "data": null
}
```

#### POST /api/orders/:id/confirm — 确认收货

**前置条件**：订单状态为 `pending_receipt`

**成功响应：**
```json
{
  "code": 0,
  "message": "已确认收货",
  "data": null
}
```

#### GET /api/orders/count — 订单状态数量统计

用于个人中心显示角标。

**成功响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "pending_payment": 2,
    "pending_shipment": 1,
    "pending_receipt": 3
  }
}
```

---

### 2.7 收货地址模块

#### GET /api/addresses — 地址列表

**成功响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "id": 1,
      "recipient_name": "张三",
      "phone": "13800000000",
      "province": "广东省",
      "city": "深圳市",
      "district": "南山区",
      "detail": "xxx街道xxx号",
      "is_default": true
    }
  ]
}
```

**排序规则**：默认地址置顶，其余按创建时间倒序。

#### POST /api/addresses — 新增地址

**请求体：**
```json
{
  "recipient_name": "张三",
  "phone": "13800000000",
  "province": "广东省",
  "city": "深圳市",
  "district": "南山区",
  "detail": "xxx街道xxx号",
  "is_default": false
}
```

**业务逻辑**：如果 `is_default = true`，将该用户其他地址的 `is_default` 置为 false。

**成功响应：**
```json
{
  "code": 0,
  "message": "添加成功",
  "data": { "id": 1 }
}
```

#### PUT /api/addresses/:id — 编辑地址

**请求体**：同新增地址。

**成功响应：**
```json
{
  "code": 0,
  "message": "修改成功",
  "data": null
}
```

#### DELETE /api/addresses/:id — 删除地址

**成功响应：**
```json
{
  "code": 0,
  "message": "删除成功",
  "data": null
}
```

#### PATCH /api/addresses/:id/default — 设为默认地址

**成功响应：**
```json
{
  "code": 0,
  "message": "设置成功",
  "data": null
}
```

---

### 2.8 系统设置模块

#### GET /api/settings — 获取系统设置

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| key | string | 是 | 设置键名：`merchant_intro` / `merchant_notice` / `buyer_notice` |

**成功响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "key": "merchant_intro",
    "value": "<p>商家简介富文本内容</p>"
  }
}
```

**错误场景：**

| 场景 | code | message |
|------|------|---------|
| key 不存在 | 404 | 设置不存在 |

---

### 2.9 文件上传模块

#### POST /api/upload — 上传文件

**请求格式**：`multipart/form-data`

| 字段 | 类型 | 说明 |
|------|------|------|
| file | File | 图片文件 |

**限制规则：**
- 最大 5MB
- 支持格式：jpg / png / webp

**成功响应：**
```json
{
  "code": 0,
  "message": "上传成功",
  "data": {
    "url": "https://xxx.supabase.co/storage/v1/object/public/uploads/xxx.jpg"
  }
}
```

---

## 3. 管理后台 API

> 所有 `/api/admin/*` 接口需要 admin 权限。

### 3.1 管理员认证

#### POST /api/admin/login — 管理员登录

**请求体：**
```json
{
  "phone": "13800000000",
  "password": "123456"
}
```

**校验流程：**
1. 校验账号是否存在
2. 校验密码
3. 校验 `role === 'admin'`
4. 校验账号是否启用

**成功响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "xxx...",
    "user": {
      "id": "uuid",
      "username": "管理员",
      "phone": "13800000000",
      "role": "admin"
    }
  }
}
```

**错误场景：**

| 场景 | code | message |
|------|------|---------|
| 非管理员 | 403 | 无权限登录 |
| 密码错误 | 400 | 密码错误 |
| 账号不存在 | 404 | 账号不存在 |
| 账号禁用 | 403 | 账号已被禁用 |

---

### 3.2 Dashboard

#### GET /api/admin/dashboard — 仪表盘数据

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
    "recent_orders": [
      {
        "id": 100,
        "order_no": "20260602143000123456",
        "user_phone": "13800000000",
        "total_amount": 150.00,
        "status": "pending_shipment",
        "status_text": "待发货",
        "created_at": "2026-06-02T14:30:00Z"
      }
    ]
  }
}
```

---

### 3.3 商品管理

#### GET /api/admin/products — 商品列表（管理员）

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 否 | 商品名称模糊搜索 |
| product_no | string | 否 | 商品编号精确搜索 |
| category_id | number | 否 | 分类筛选 |
| status | string | 否 | 状态筛选：active/inactive |
| page | number | 否 | 页码 |
| page_size | number | 否 | 每页数量 |

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
        "product_no": "P10001",
        "barcode": "6901234567890",
        "main_image": "https://...",
        "category": { "id": 1, "name": "一元区/子分类A" },
        "price_range": "1.50 ~ 12.00",
        "total_stock": 700,
        "sales_count": 100,
        "status": "active"
      }
    ],
    "total": 100,
    "page": 1,
    "page_size": 20
  }
}
```

#### GET /api/admin/products/:id — 商品详情（含规格）

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
    "category_id": 1,
    "main_image": "https://...",
    "description": "<p>富文本</p>",
    "status": "active",
    "skus": [
      {
        "id": 1,
        "sku_name": "个",
        "price": 1.50,
        "stock": 500,
        "min_order_qty": 10
      }
    ]
  }
}
```

#### POST /api/admin/products — 新增商品

**请求体：**
```json
{
  "name": "商品名称",
  "barcode": "6901234567890",
  "category_id": 1,
  "main_image": "https://...",
  "description": "<p>富文本</p>",
  "skus": [
    {
      "sku_name": "个",
      "price": 1.50,
      "stock": 500,
      "min_order_qty": 10
    }
  ]
}
```

**业务逻辑**：`product_no` 由后端自动生成。

**成功响应：**
```json
{
  "code": 0,
  "message": "创建成功",
  "data": { "id": 1, "product_no": "P10001" }
}
```

#### PUT /api/admin/products/:id — 编辑商品

**请求体**：同新增商品（包含完整的 skus 数组）。

**业务逻辑**：
- 新增的 sku → INSERT
- 已有的 sku（有 id）→ UPDATE
- 请求中不存在的旧 sku → DELETE

**成功响应：**
```json
{
  "code": 0,
  "message": "更新成功",
  "data": null
}
```

#### DELETE /api/admin/products/:id — 删除商品

**成功响应：**
```json
{
  "code": 0,
  "message": "删除成功",
  "data": null
}
```

#### PATCH /api/admin/products/:id/status — 上架/下架切换

**请求体：**
```json
{
  "status": "inactive"
}
```

**成功响应：**
```json
{
  "code": 0,
  "message": "状态已更新",
  "data": null
}
```

---

### 3.4 分类管理

#### GET /api/admin/categories — 分类列表（完整树）

**成功响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "id": 1,
      "name": "一元区",
      "parent_id": null,
      "sort_order": 1,
      "show_in_client": true,
      "children": [
        { "id": 5, "name": "子分类A", "parent_id": 1, "sort_order": 1, "show_in_client": true }
      ]
    }
  ]
}
```

#### POST /api/admin/categories — 新增分类

**请求体：**
```json
{
  "name": "分类名称",
  "parent_id": null,
  "sort_order": 1,
  "show_in_client": true
}
```

#### PUT /api/admin/categories/:id — 编辑分类

**请求体**：同新增。

#### DELETE /api/admin/categories/:id — 删除分类

**限制条件**：无子级分类时才可删除。

---

### 3.5 订单管理

#### GET /api/admin/orders — 订单列表（管理员）

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| order_no | string | 否 | 订单号搜索 |
| user_phone | string | 否 | 用户手机号搜索 |
| status | string | 否 | 状态筛选 |
| page | number | 否 | 页码 |
| page_size | number | 否 | 每页数量 |

**成功响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": 1,
        "order_no": "20260602143000123456",
        "user_phone": "13800000000",
        "total_amount": 150.00,
        "status": "pending_shipment",
        "status_text": "待发货",
        "item_count": 3,
        "created_at": "2026-06-02T14:30:00Z"
      }
    ],
    "total": 50,
    "page": 1,
    "page_size": 20
  }
}
```

#### GET /api/admin/orders/:id — 订单详情（管理员）

**成功响应**：同用户端订单详情，额外包含用户手机号。

#### POST /api/admin/orders/:id/ship — 订单发货

**请求体：**
```json
{
  "shipping_no": "SF1234567890"
}
```

**业务逻辑**：
- 校验订单状态为 `pending_shipment`
- 更新状态 → `pending_receipt`
- 记录物流单号

**成功响应：**
```json
{
  "code": 0,
  "message": "发货成功",
  "data": null
}
```

#### POST /api/admin/orders/:id/cancel — 管理员取消订单

**业务逻辑（事务）：**
1. 更新订单状态 → `cancelled`
2. 恢复 SKU 库存

#### PATCH /api/admin/orders/:id/status — 修改订单状态

**请求体：**
```json
{
  "status": "completed"
}
```

---

### 3.6 用户管理

#### GET /api/admin/users — 用户列表

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| phone | string | 否 | 手机号搜索 |
| keyword | string | 否 | 用户编号/用户名搜索 |
| page | number | 否 | 页码 |
| page_size | number | 否 | 每页数量 |

**成功响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "uuid",
        "username": "张三",
        "phone": "13800000000",
        "role": "user",
        "status": "active",
        "created_at": "2026-06-01T10:00:00Z"
      }
    ],
    "total": 128,
    "page": 1,
    "page_size": 20
  }
}
```

#### POST /api/admin/users — 新增用户

**请求体：**
```json
{
  "username": "张三",
  "phone": "13800000000",
  "password": "123456"
}
```

**业务逻辑：**
1. 校验手机号不重复
2. 调用 Supabase Admin API 创建 auth 用户
3. 创建 profiles 记录

**成功响应：**
```json
{
  "code": 0,
  "message": "创建成功",
  "data": { "id": "uuid" }
}
```

#### PATCH /api/admin/users/:id/status — 启用/禁用用户

**请求体：**
```json
{
  "status": "disabled"
}
```

#### POST /api/admin/users/:id/reset-password — 重置密码

**请求体：**
```json
{
  "password": "newpassword123"
}
```

**业务逻辑**：调用 Supabase Admin API 更新用户密码。

---

### 3.7 首页配置管理

#### GET /api/admin/home-config — 获取首页配置

**成功响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "banners": [
      { "id": 1, "image_url": "https://...", "link_url": "/product/1", "sort_order": 1, "is_active": true }
    ],
    "quick_icons": [
      { "id": 1, "name": "爆品", "icon_url": "", "link_url": "/products?tag=hot", "sort_order": 1, "is_active": true }
    ],
    "home_products": [
      { "id": 1, "product_id": 10, "product_name": "商品A", "sort_order": 1 }
    ]
  }
}
```

#### PUT /api/admin/home-config/banners — 更新轮播图配置

**请求体：**
```json
{
  "banners": [
    { "id": 1, "image_url": "https://...", "link_url": "/product/1", "sort_order": 1, "is_active": true },
    { "image_url": "https://...", "link_url": "/category/2", "sort_order": 2, "is_active": true }
  ]
}
```

**业务逻辑**：有 id 的更新，无 id 的新增，不在列表中的删除。

#### PUT /api/admin/home-config/quick-icons — 更新金刚区配置

**请求体：**
```json
{
  "icons": [
    { "id": 1, "name": "爆品", "icon_url": "", "link_url": "/products?tag=hot", "sort_order": 1, "is_active": true }
  ]
}
```

#### PUT /api/admin/home-config/products — 更新热销推荐商品

**请求体：**
```json
{
  "product_ids": [10, 20, 30, 40]
}
```

**业务逻辑**：全量替换 home_products 表。

---

### 3.8 系统设置管理

#### GET /api/admin/settings — 获取所有系统设置

**成功响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "merchant_intro": "<p>商家简介</p>",
    "merchant_notice": "<p>商家公告</p>",
    "buyer_notice": "<p>买家须知</p>"
  }
}
```

#### PUT /api/admin/settings — 更新系统设置

**请求体：**
```json
{
  "merchant_intro": "<p>更新后的商家简介</p>",
  "merchant_notice": "<p>更新后的商家公告</p>",
  "buyer_notice": "<p>更新后的买家须知</p>"
}
```

---

## 4. 接口汇总表

### 用户端（需认证）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/login | 用户登录 |
| GET | /api/home | 首页数据 |
| GET | /api/categories | 分类树 |
| GET | /api/products | 商品列表 |
| GET | /api/products/:id | 商品详情 |
| GET | /api/cart | 购物车列表 |
| POST | /api/cart | 加入购物车 |
| PUT | /api/cart/:id | 修改购物车 |
| DELETE | /api/cart/:id | 删除购物车 |
| POST | /api/orders | 创建订单 |
| GET | /api/orders | 订单列表 |
| GET | /api/orders/count | 订单数量统计 |
| GET | /api/orders/:id | 订单详情 |
| POST | /api/orders/:id/cancel | 取消订单 |
| POST | /api/orders/:id/confirm | 确认收货 |
| GET | /api/addresses | 地址列表 |
| POST | /api/addresses | 新增地址 |
| PUT | /api/addresses/:id | 编辑地址 |
| DELETE | /api/addresses/:id | 删除地址 |
| PATCH | /api/addresses/:id/default | 设为默认 |
| GET | /api/settings/:key | 获取系统设置 |
| POST | /api/upload | 上传文件 |

### 管理后台（需认证 + admin）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/admin/login | 管理员登录 |
| GET | /api/admin/dashboard | 仪表盘 |
| GET | /api/admin/products | 商品列表 |
| GET | /api/admin/products/:id | 商品详情 |
| POST | /api/admin/products | 新增商品 |
| PUT | /api/admin/products/:id | 编辑商品 |
| DELETE | /api/admin/products/:id | 删除商品 |
| PATCH | /api/admin/products/:id/status | 上下架 |
| GET | /api/admin/categories | 分类列表 |
| POST | /api/admin/categories | 新增分类 |
| PUT | /api/admin/categories/:id | 编辑分类 |
| DELETE | /api/admin/categories/:id | 删除分类 |
| GET | /api/admin/orders | 订单列表 |
| GET | /api/admin/orders/:id | 订单详情 |
| POST | /api/admin/orders/:id/ship | 发货 |
| POST | /api/admin/orders/:id/cancel | 取消订单 |
| PATCH | /api/admin/orders/:id/status | 修改状态 |
| GET | /api/admin/users | 用户列表 |
| POST | /api/admin/users | 新增用户 |
| PATCH | /api/admin/users/:id/status | 启用/禁用 |
| POST | /api/admin/users/:id/reset-password | 重置密码 |
| GET | /api/admin/home-config | 首页配置 |
| PUT | /api/admin/home-config/banners | 更新轮播图 |
| PUT | /api/admin/home-config/quick-icons | 更新金刚区 |
| PUT | /api/admin/home-config/products | 更新热销商品 |
| GET | /api/admin/settings | 系统设置 |
| PUT | /api/admin/settings | 更新系统设置 |
