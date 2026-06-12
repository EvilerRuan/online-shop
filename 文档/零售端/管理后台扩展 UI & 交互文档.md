# 零售商城 — 管理后台扩展 UI & 交互文档

## 0. 全局规则

### 0.1 与现有后台集成
- 在现有管理后台（React 18 + Ant Design 5 + Zustand）基础上扩展
- 新增菜单项追加到侧边栏底部
- 扩展模块在现有页面内通过 Tab/筛选器区分

### 0.2 权限
- 所有零售管理模块复用现有 adminMiddleware
- role === admin 可访问所有模块

### 0.3 API 统一格式
```json
{ "code": 0, "message": "success", "data": {} }
```

---

## 1. Dashboard 扩展

### 页面结构变更
在现有 Dashboard 顶部增加渠道切换器。

### 页面元素
- 渠道切换器（Radio.Group / Segmented）：全部 / 批发 / 零售
- 统计卡片（随渠道切换变化）：
  - 用户总数
  - 商品总数
  - 订单总数
  - 今日订单金额
- 零售模式额外显示：
  - 待处理售后数量（红色角标）
  - 待回复消息数量（红色角标）
- 最近订单列表（随渠道筛选）

### 交互逻辑
1. 页面加载 → GET /api/admin/dashboard?channel=all
2. 切换渠道 → GET /api/admin/dashboard?channel=retail（或 wholesale）
3. 零售模式下：
   - 待处理售后数量 → 点击跳转售后管理页
   - 待回复消息数量 → 点击跳转客服消息页
4. 最近订单列表增加 channel 列标识

---

## 2. 商品管理扩展

### 2.1 商品列表页扩展

#### 新增元素
- 筛选区增加"销售渠道"下拉：全部 / 批发 / 零售 / 双渠道

#### 表格新增列
| 列名 | 字段 | 说明 |
|------|------|------|
| 零售价 | retail_price | ¥xx.xx |
| 销售渠道 | sales_channel | 标签：批发/零售/双渠道 |

### 2.2 商品编辑页扩展

#### 新增表单字段
| 字段 | 组件 | 说明 |
|------|------|------|
| 零售价 | InputNumber | 精度 2 位小数，最小值 0 |
| 销售渠道 | Radio.Group | wholesale / retail / both |

#### 交互逻辑
1. 编辑模式 → 回填 retail_price 和 sales_channel
2. 保存 → 在现有商品保存接口中增加 retail_price/sales_channel 字段
3. 渠道为 wholesale 时，零售价字段可选填

---

## 3. 订单管理扩展

### 页面结构变更
在订单列表顶部增加渠道 Tab。

### 页面元素
- 渠道 Tab（Tabs 组件）：全部订单 / 批发订单 / 零售订单
- 现有筛选条件保持不变
- 零售订单列表增加运费列

### 表格变更
| 新增列 | 字段 | 说明 |
|--------|------|------|
| 渠道 | channel | 标签：批发/零售 |
| 运费 | shipping_fee | 仅零售订单显示 |

### 交互逻辑
1. Tab 切换 → 重新请求（附加 channel 参数）
2. GET /api/admin/orders?channel=retail
3. 其他交互保持与现有订单管理一致

---

## 4. 用户管理扩展

### 页面结构变更
在用户管理页面增加渠道 Tab。

### 4.1 批发用户（现有）
保持现有功能不变，增加 channel=wholesale 筛选。

### 4.2 零售用户（新增 Tab）

#### 页面元素
- 搜索区：手机号、用户名搜索
- 表格列：用户名、手机号、头像、注册时间、积分余额、推荐人数、状态
- 操作列：积分调整、查看详情

#### 交互逻辑
1. 页面加载 → GET /api/admin/retail-users?page=1
2. 搜索 → 带参数请求
3. "积分调整" → 弹出 Modal：
   - 调整类型：增加 / 扣减
   - 积分数量（正整数）
   - 调整原因（必填）
   - 确认 → POST /api/admin/retail-users/:id/adjust-points
   - 成功 → 刷新列表

---

## 5. 首页配置扩展

### 页面结构变更
增加渠道 Tab：批发端配置 / 零售端配置

### 5.1 批发端配置（现有）
保持现有功能不变。

### 5.2 零售端配置（新增 Tab）

#### 5.2.1 轮播图管理

**页面元素：**
- 轮播图列表表格：图片预览、标题、跳转链接、排序、是否启用
- 新增/编辑按钮

**交互逻辑：**
1. 列表 → GET /api/admin/retail-home-config/banners
2. 新增/编辑 → Modal 表单（图片上传、标题、链接、排序、启用开关）
3. 保存 → POST/PUT /api/admin/retail-home-config/banners
4. 删除 → 二次确认 → DELETE

#### 5.2.2 金刚区图标管理

**页面元素：**
- 图标列表表格：图标预览、名称、跳转链接、排序、是否启用
- 新增/编辑按钮

**交互逻辑：**
同轮播图管理，使用 /api/admin/retail-home-config/quick-icons

#### 5.2.3 热销推荐商品管理

**页面元素：**
- 推荐商品列表表格：商品图片、名称、零售价、排序
- 添加商品按钮

**交互逻辑：**
1. 列表 → GET /api/admin/retail-home-config/products
2. 添加 → Modal 中搜索零售商品 → 选择添加
3. 删除 → 二次确认 → DELETE
4. 排序调整 → 拖拽或输入排序值

---

## 6. 运费管理（新增模块）

### 6.1 运费列表页

#### 页面元素
- "新增运费配置"按钮
- "默认运费设置"按钮
- 运费配置表格：

| 列名 | 字段 | 说明 |
|------|------|------|
| 省份 | province | |
| 城市 | city | 空表示该省所有城市 |
| 运费类型 | fee_type | fixed / free_threshold / free |
| 基础运费 | base_fee | ¥xx.xx |
| 免运费阈值 | free_threshold | 满 xx 免运费 |
| 是否启用 | is_active | Switch 开关 |
| 操作 | — | 编辑 / 删除 |

#### 交互逻辑
1. 页面加载 → GET /api/admin/shipping-fees
2. 搜索/筛选 → 带参数请求
3. 切换启用状态 → PUT /api/admin/shipping-fees/:id

### 6.2 新增/编辑运费配置（Modal 或 Drawer）

#### 表单字段
| 字段 | 组件 | 说明 |
|------|------|------|
| 省份 | Input / Select | 必填 |
| 城市 | Input | 可选，空表示该省所有城市 |
| 运费类型 | Radio.Group | fixed(固定运费) / free_threshold(满额免运费) / free(包邮) |
| 基础运费 | InputNumber | fee_type=fixed 或 free_threshold 时显示 |
| 免运费阈值 | InputNumber | fee_type=free_threshold 时显示 |
| 是否启用 | Switch | |

#### 交互逻辑
1. 运费类型切换 → 动态显示/隐藏相关字段
2. 保存 → POST/PUT /api/admin/shipping-fees
3. 校验：fixed 类型必须填写 base_fee；free_threshold 类型必须填写 base_fee 和 free_threshold

### 6.3 默认运费设置（Modal）

#### 表单字段
| 字段 | 组件 | 说明 |
|------|------|------|
| 默认运费 | InputNumber | system_settings.default_shipping_fee |
| 默认免运费阈值 | InputNumber | system_settings.default_free_threshold |

#### 交互逻辑
1. 打开 → GET /api/admin/settings?key=default_shipping_fee&key=default_free_threshold
2. 保存 → PUT /api/admin/settings

---

## 7. 积分管理（新增模块，4个子页）

### 7.1 积分规则

#### 页面元素
- 配置表单（非表格，KV 表单）：

| 字段 | 说明 | 默认值 |
|------|------|--------|
| 注册赠送积分 | register_points | 100 |
| 推荐新人积分 | referral_points | 200 |
| 首次确认收货积分 | first_purchase_points | 100 |

#### 交互逻辑
1. 页面加载 → GET /api/admin/points-config
2. 修改数值 → 点击"保存" → PUT /api/admin/points-config
3. 保存成功 → Toast "积分规则已更新"

### 7.2 积分商品

#### 页面元素
- "新增积分商品"按钮
- 积分商品表格：

| 列名 | 字段 | 说明 |
|------|------|------|
| 图片 | image | 缩略图 |
| 名称 | name | |
| 所需积分 | points_cost | |
| 库存 | stock | |
| 是否启用 | is_active | Switch |
| 操作 | — | 编辑 / 删除 |

#### 交互逻辑
1. 列表 → GET /api/admin/points-products
2. 新增/编辑 → Modal 表单（名称、图片上传、所需积分、库存、启用开关）
3. 保存 → POST/PUT /api/admin/points-products
4. 删除 → 二次确认

### 7.3 兑换记录

#### 页面元素
- 兑换记录表格：

| 列名 | 字段 | 说明 |
|------|------|------|
| 用户 | user | 用户名 + 手机号 |
| 商品名称 | product_name | 快照 |
| 消耗积分 | points_used | |
| 状态 | status | pending/shipped/completed/cancelled |
| 兑换时间 | created_at | |
| 操作 | — | 发货（pending 状态） |

#### 交互逻辑
1. 列表 → GET /api/admin/points-products/redeem
2. 搜索 → 按用户名/手机号筛选
3. "发货" → 二次确认 → PATCH /api/admin/points-products/redeem/:id/ship
4. 发货成功 → 状态变为 shipped

### 7.4 积分流水

#### 页面元素
- 筛选区：用户搜索、类型（earn/spend）、原因（register/referral/first_purchase/redeem/admin_adjust）
- 流水表格：

| 列名 | 字段 | 说明 |
|------|------|------|
| 用户 | user | 用户名 + 手机号 |
| 类型 | type | earn(绿色)/spend(红色) |
| 原因 | reason | 中文标签 |
| 积分变动 | amount | +xxx / -xxx |
| 变动后余额 | balance_after | |
| 时间 | created_at | |

#### 交互逻辑
1. 列表 → GET /api/admin/points-ledger
2. 筛选 → 带参数请求
3. 分页 → 标准 Ant Design Table 分页

---

## 8. 售后管理（新增模块）

### 8.1 售后工单列表

#### 页面元素
- 顶部 Tab：全部 / 待处理(pending) / 处理中(processing) / 已完成(completed) / 已拒绝(rejected) / 已关闭(closed)
- 工单表格：

| 列名 | 字段 | 说明 |
|------|------|------|
| 工单号 | id | |
| 订单号 | order.order_no | 可点击跳转订单详情 |
| 用户 | user | 用户名 + 手机号 |
| 售后类型 | type | refund(仅退款) / return_refund(退货退款) |
| 状态 | status | 标签 + 颜色 |
| 退款金额 | refund_amount | ¥xx.xx |
| 申请时间 | created_at | |
| 操作 | — | 查看详情 |

#### 交互逻辑
1. 列表 → GET /api/admin/after-sales?status=xxx
2. Tab 切换 → 重新请求
3. "查看详情" → 进入工单详情页

### 8.2 售后工单详情

#### 页面元素
- 工单信息卡片：工单号、售后类型、状态、退款金额
- 用户信息：用户名、手机号
- 关联订单信息：订单号、商品信息、订单金额
- 申请原因、凭证图片
- 退货快递单号（如已填写）
- 状态流转时间线
- 操作按钮区

#### 操作按钮（根据类型和状态）

| 状态 | 类型 | 可用操作 |
|------|------|---------|
| pending | refund(仅退款) | 同意(approve) / 拒绝(reject) |
| pending | return_refund(退货退款) | 同意(approve → processing) |
| processing | return_refund | 确认收货退款(confirm-return → completed) / 拒绝(reject) |

#### 交互逻辑
1. 页面加载 → GET /api/admin/after-sales/:id
2. "同意" → 二次确认 Modal → POST /api/admin/after-sales/:id/approve
3. "拒绝" → Modal 填写拒绝原因 → POST /api/admin/after-sales/:id/reject
4. "确认收货退款" → 二次确认 → POST /api/admin/after-sales/:id/confirm-return
5. 操作成功 → 刷新工单信息

---

## 9. 客服消息（新增模块）

### 页面结构
左右分栏布局（类似微信 PC版）。

### 9.1 左侧 — 用户列表

#### 页面元素
- 搜索框（搜索用户名/手机号）
- 用户列表：头像、用户名、最后一条消息预览、时间、未读消息数角标

#### 交互逻辑
1. 页面加载 → GET /api/admin/customer-service/users
2. 搜索 → 带参数请求
3. 点击用户 → 右侧加载聊天记录
4. 未读消息 → 红色角标

### 9.2 右侧 — 聊天记录

#### 页面元素
- 顶部：当前聊天用户名
- 消息列表（气泡样式）：
  - 用户消息靠左（灰色气泡）
  - 管理员回复靠右（蓝色气泡）
  - 时间分隔线
- 底部输入区：文本输入框 + 发送按钮

#### 交互逻辑
1. 选中用户 → GET /api/admin/customer-service/messages/:userId
2. 发送消息 → POST /api/admin/customer-service/messages/:userId
3. 自动滚动到底部
4. WebSocket 模式：实时接收新消息
5. HTTP 轮询模式：每 5 秒检查新消息
6. 标记已读 → 进入聊天时自动标记

---

## 10. 系统设置扩展

### 页面结构变更
在现有系统设置页面新增"零售设置"区块。

### 新增设置项

| 设置项 | key | 说明 |
|--------|-----|------|
| 默认运费 | default_shipping_fee | 数值 |
| 默认免运费阈值 | default_free_threshold | 数值 |
| 客服自动回复语 | customer_service_auto_reply | 文本 |

### 交互逻辑
1. 复用现有系统设置 CRUD 接口
2. 保存 → PUT /api/admin/settings（批量更新）
3. 与现有设置项在同一页面展示，使用 Divider 分隔
