# 线上批发商城 H5 — 管理后台 UI 实现映射文档

> 本文档基于 **管理后台 UI & 交互文档** 编写，逐页映射到 Ant Design 5 组件，实现方案严格按照交互文档中的页面结构和交互逻辑。

## 全局设计

### 主题

- 使用 Ant Design 5 默认主题，不做过度定制
- 主色：Ant Design 默认蓝色 `#1677FF`
- 布局：左侧固定侧边栏 + 右侧主内容区

### 布局结构（AdminLayout）

```
┌──────────────────────────────────────────────────────┐
│  Header（固定高度 64px）                              │
│  Logo + 系统名称（左）      管理员信息 + 退出（右）     │
├────────────┬─────────────────────────────────────────┤
│            │                                         │
│  侧边栏     │                                         │
│  (固定宽度  │         主内容区域                       │
│   200px)   │         （带内边距）                      │
│            │                                         │
│  菜单项     │                                         │
│            │                                         │
└────────────┴─────────────────────────────────────────┘
```

### 侧边栏菜单

| 菜单项 | Icon | 路由 |
|--------|------|------|
| Dashboard | `<DashboardOutlined />` | `/admin/dashboard` |
| 商品管理 | `<ShoppingOutlined />` | `/admin/products` |
| 分类管理 | `<AppstoreOutlined />` | `/admin/categories` |
| 订单管理 | `<OrderedListOutlined />` | `/admin/orders` |
| 用户管理 | `<UserOutlined />` | `/admin/users` |
| 首页配置 | `<HomeOutlined />` | `/admin/home-config` |
| 系统设置 | `<SettingOutlined />` | `/admin/settings` |

组件：`<a-menu>` + `<a-layout-sider>`，默认选中当前路由对应菜单项。

---

## 1. 管理员登录页

### 交互文档描述

系统 Logo + 标题 "管理后台" + 手机号输入框 + 密码输入框 + 登录按钮

### 页面布局

```
┌─────────────────────────────────────┐
│                                     │
│           [Logo]                    │
│         管理后台                     │
│                                     │
│     ┌─────────────────────────┐    │
│     │                         │    │
│     │  手机号: [输入框]        │    │
│     │  密码:   [输入框]        │    │
│     │                         │    │
│     │      [登录按钮]          │    │
│     │                         │    │
│     └─────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

### 组件映射

| 区域 | Ant Design 组件 | 说明 |
|------|-----------------|------|
| 登录卡片 | `<a-card>` 或自定义 `<div>` | 居中显示，白色背景，圆角，阴影 |
| Logo | `<img>` | 系统 Logo 图片 |
| 标题 | `<h2>` | "管理后台" |
| 手机号输入 | `<a-input v-model:value="phone" placeholder="请输入手机号">` | 格式校验：手机号 |
| 密码输入 | `<a-input-password v-model:value="password" placeholder="请输入密码">` | 最小 6 位 |
| 登录按钮 | `<a-button type="primary" block :loading="loading" @click="handleLogin">登录</a-button>` | 主色按钮，加载中状态 |

### 交互逻辑

1. 输入手机号和密码 → 点击登录
2. 调用 `POST /api/admin/login`
3. 校验流程：账号存在 → 密码正确 → role === admin → 账号未禁用
4. 成功 → 保存 token 到 localStorage → `router.push('/admin/dashboard')`
5. 失败 → `message.error(data.message)` 提示具体错误

### 路由守卫

- 未登录 → 强制跳转 `/admin/login`
- 已登录但 role !== admin → 清除 token → 跳转登录页
- Token 无效 → 自动清除 → 跳转登录页

---

## 2. Dashboard 首页

### 交互文档描述

用户总数卡片 + 商品总数卡片 + 订单总数卡片 + 今日订单金额 + 最近订单列表（5条）

### 页面布局

```
┌──────────────────────────────────────────────────────┐
│  Dashboard                                            │
├──────────────────────────────────────────────────────┤
│  ──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ 用户总数  │ │ 商品总数  │ │ 订单总数  │ │ 今日金额  │ │ ← 4 张统计卡片
│  │   128    │ │   356    │ │   1024   │ │ ¥5,680  │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
├──────────────────────────────────────────────────────┤
│  最近订单                                            │
│  ┌──────────────────────────────────────────────────┐│
│  │ 订单号 │ 用户手机号 │ 金额 │ 状态 │ 时间 │ 操作 │  │ ← Table
│  ├────────┼───────────┼──────┼──────┼──────┼──────┤  │
│  │ 2026...│ 1380000... │ ¥150 │ 待发货│ 14:30│ 查看 │  │
│  │ ...    │ ...       │ ...  │ ...  │ ...  │ ...  │  │
│  └──────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────┘
```

### 组件映射

| 区域 | Ant Design 组件 | 说明 |
|------|-----------------|------|
| 统计卡片 | `<a-row :gutter="16">` + 4 个 `<a-col :span="6">` | 每张卡片 `<a-statistic>` 组件，带标题和数值 |
| 卡片图标 | 自定义 `<div>` + Icon | 用户数(`<UserOutlined />`)、商品数(`<ShoppingOutlined />`)、订单数(`<OrderedListOutlined />`)、金额(`<DollarOutlined />`) |
| 最近订单标题 | `<h3>最近订单</h3>` | 区域标题 |
| 订单列表 | `<a-table>` | 列：订单号、用户手机号、金额、状态、时间、操作。只显示最近 5 条 |
| 状态标签 | `<a-tag>` | 不同状态用不同颜色（待付款=橙色，待发货=蓝色，待收货=绿色，已完成=灰色，已取消=红色） |
| 查看操作 | `<a-button type="link" size="small">查看</a-button>` | 点击跳转订单详情页 |

### 交互逻辑

- 页面加载 → 调用 `GET /api/admin/dashboard`
- 数据展示 → 统计卡片显示数字，Table 显示最近 5 条订单
- 点击 "查看" → `router.push('/admin/orders/' + id)`

---

## 3. 商品管理

### 3.1 商品列表页

### 交互文档描述

搜索区（商品名称 + 商品编号 + 分类下拉 + 状态筛选） + Table（图片/名称/编号/条码/分类/价格区间/库存/销量/状态/操作） + 新增商品按钮

### 页面布局

```
┌──────────────────────────────────────────────────────┐
│  商品管理                              [+ 新增商品]    │
├──────────────────────────────────────────────────────┤
│  ┌──────────┬──────────┬──────────┬──────────┐       │ ← 搜索区
│  │ 商品名称  │ 商品编号  │ 分类      │ 状态      │       │
│  │ [输入框] │ [输入框] │ [下拉]   │ [下拉]   │       │
│  └──────────┴──────────┴──────────┴──────────┘       │
├──────────────────────────────────────────────────────┤
│  ──────────────────────────────────────────────────┐│
│  │ 图片 │ 名称 │ 编号 │ 条码 │ 分类 │ 价格 │ 库存 │  │ ← Table
│  │      │      │      │      │      │      │      │  │
│  │ [图] │ A    │ P001 │ 690  │ 一元  │ 1-10 │ 500  │  │
│  │      │      │      │      │      │      │      │  │
│  │ [编辑] [删除] [上架/下架]                         │  │ ← 操作列
│  ──────────────────────────────────────────────────┘│
│  分页器 [1] [2] [3] ...                             │
└──────────────────────────────────────────────────────┘
```

### 组件映射

| 区域 | Ant Design 组件 | 说明 |
|------|-----------------|------|
| 新增按钮 | `<a-button type="primary" @click="handleAdd">新增商品</a-button>` | 右上角 |
| 搜索表单 | `<a-form layout="inline">` | 4 个查询字段 |
| 商品名称搜索 | `<a-input v-model:value="query.name" placeholder="商品名称" allow-clear>` | 模糊搜索 |
| 商品编号搜索 | `<a-input v-model:value="query.product_no" placeholder="商品编号" allow-clear>` | 精确搜索 |
| 分类下拉 | `<a-select v-model:value="query.category_id" placeholder="全部分类" allow-clear>` | 加载分类树数据 |
| 状态下拉 | `<a-select v-model:value="query.status" placeholder="全部状态" allow-clear>` | 选项：上架/下架 |
| 查询按钮 | `<a-button type="primary" @click="handleSearch">查询</a-button>` | 触发搜索 |
| 重置按钮 | `<a-button @click="handleReset">重置</a-button>` | 清空查询条件 |
| Table | `<a-table :columns="columns" :data-source="list" :pagination="pagination">` | 数据表格 |
| 图片列 | `<a-image :src="record.main_image" :width="48" :height="48" />` | 缩略图 |
| 名称列 | 可点击文字，点击跳转编辑页 | |
| 价格区间 | 计算最低~最高规格价格 | 如 "1.50 ~ 12.00" |
| 库存 | 汇总所有规格库存 | |
| 状态列 | `<a-switch v-model:checked="record.status === 'active'" @change="handleStatusChange" />` | 上架/下架开关 |
| 操作列 | `<a-space>` | 编辑 + 删除 + 上架/下架 |
| 编辑 | `<a-button type="link" @click="handleEdit(record.id)">编辑</a-button>` | 跳转编辑页 |
| 删除 | `<a-button type="link" danger @click="handleDelete(record.id)">删除</a-button>` | Popconfirm 二次确认 |
| 分页 | `<a-pagination>` | 默认 20 条/页 |

### 交互逻辑

1. 页面加载 → 调用 `GET /api/admin/products` + 加载分类下拉数据
2. 点击查询 → 调用 API（带查询参数） → 刷新表格
3. 点击重置 → 清空查询条件 → 重新加载
4. 点击新增 → `router.push('/admin/products/edit')`
5. 点击编辑 → `router.push('/admin/products/edit/' + id)`
6. 点击删除 → Popconfirm 确认 → `DELETE /api/admin/products/:id` → 刷新
7. 状态切换 → `PATCH /api/admin/products/:id/status` → 刷新
8. 点击名称 → 跳转编辑页

---

### 3.2 商品编辑页

### 交互文档描述

基础信息（商品名称 + 商品编号自动生成 + 条码 + 分类 + 主图上传 + 详情富文本） + 规格管理表格（规格名称 + 单价 + 库存 + 最低起订量 + 新增/删除/修改）

### 页面布局

```
┌──────────────────────────────────────────────────────┐
│  ← 返回           新增商品 / 编辑商品                  │
──────────────────────────────────────────────────────┤
│  基础信息                                            │
│  ──────────────────────────────────────────────────┐│
│  │ 商品名称: [输入框]（必填）                         ││
│  │ 商品编号: P10001（自动生成，不可编辑）             ││
│  │ 条码:     [输入框]                                ││
│  │ 分类:     [级联选择器]（一级/二级）                ││
│  │ 商品主图: [上传组件]（单图）                       ││
│  │ 商品详情: [富文本编辑器]                           ││
│  └──────────────────────────────────────────────────│
├──────────────────────────────────────────────────────┤
│  规格管理                                            │
│  ┌──────────────────────────────────────────────────┐│
│  │ 规格名称 │ 单价 │ 库存 │ 最低起订量 │ 操作         ││ ← 规格表格
│  ├──────────┼──────┼──────┼────────────┼────────────┤│
│  │ [个]     │ 1.50 │ 500  │ 10         │ [删除]      ││
│  │ [包]     │ 12.0 │ 200  │ 5          │ [删除]      ││
│  └──────────┴──────┴──────┴────────────┴────────────┘│
│                            [+ 新增规格]                │ ← 新增规格按钮
├──────────────────────────────────────────────────────┤
│                    [保存] [取消]                      │ ← 底部操作按钮
└──────────────────────────────────────────────────────┘
```

### 组件映射

| 区域 | Ant Design 组件 | 说明 |
|------|-----------------|------|
| 返回按钮 | `<a-button @click="router.back()">返回</a-button>` | 左上角 |
| 表单 | `<a-form :model="form" :rules="rules" ref="formRef">` | 基础信息表单 |
| 商品名称 | `<a-form-item label="商品名称" name="name" required>` + `<a-input>` | 必填 |
| 商品编号 | `<a-form-item label="商品编号">` + `<a-input disabled>` | 新增时显示 "自动生成"，编辑时显示编号 |
| 条码 | `<a-form-item label="条码">` + `<a-input>` | 可选 |
| 分类 | `<a-form-item label="分类" name="category_id" required>` + `<a-cascader>` | 级联选择器，数据源为分类树 |
| 商品主图 | `<a-form-item label="商品主图">` + `<a-upload>` | 单图上传，使用 `/api/upload` |
| 商品详情 | `<a-form-item label="商品详情">` + 富文本编辑器 | 使用 `@wangeditor/editor` 或类似组件 |
| 规格表格 | `<a-table :columns="skuColumns" :data-source="form.skus" :pagination="false">` | 规格行内编辑 |
| 规格名称 | `<a-input v-model:value="record.sku_name" />` | 如 "个"、"包"、"件" |
| 单价 | `<a-input-number v-model:value="record.price" :min="0" :precision="2" />` | Decimal 类型 |
| 库存 | `<a-input-number v-model:value="record.stock" :min="0" />` | 整数 |
| 最低起订量 | `<a-input-number v-model:value="record.min_order_qty" :min="1" />` | 整数，最小 1 |
| 删除规格 | `<a-button type="link" danger @click="handleDeleteSku(index)">删除</a-button>` | 删除当前行 |
| 新增规格 | `<a-button type="dashed" block @click="handleAddSku">+ 新增规格</a-button>` | 在表格下方 |
| 保存按钮 | `<a-button type="primary" @click="handleSubmit">保存</a-button>` | 表单校验通过后提交 |
| 取消按钮 | `<a-button @click="router.back()">取消</a-button>` | 返回列表页 |

### 交互逻辑

1. 新增模式 → 商品编号显示 "自动生成"
2. 编辑模式 → 加载商品详情 + 规格列表，回显到表单
3. 图片上传 → 调用 `POST /api/upload` → 获取 URL → 存入表单
4. 新增规格 → 表格新增一行空数据
5. 删除规格 → 从表格移除该行
6. 保存 → 表单校验 → `POST/PUT /api/admin/products` → 成功则返回列表页
7. 取消 → `router.back()`

### 编辑时规格同步逻辑

- 有 `id` 的规格 → UPDATE
- 无 `id` 的新规格 → INSERT
- 旧有但请求中不存在的规格 → DELETE

---

## 4. 分类管理

### 交互文档描述

左侧一级分类 + 右侧二级分类 + 新增/编辑/删除分类（删除必须无子级）

### 页面布局

```
┌──────────────────────────────────────────────────────
│  分类管理                              [+ 新增分类]    │
├──────────┬───────────────────────────────────────────┤
│ 一级分类  │ 二级分类（当前选中一级分类的子分类）        │
│          │                                           │
│ [全部]    │ [全部]  [排序:1]  [显示]  [编辑][删除]    │ ← 二级分类行
│ [一元区]  │                                           │
│ [处理区]  │ [洗发水] [排序:1] [显示] [编辑][删除]    │
│ [新品区]  │ [沐浴露] [排序:2] [显示] [编辑][删除]    │
│ [爆品区]  │ [牙膏]   [排序:3] [显示] [编辑][删除]    │
│          │ [香水]   [排序:4] [显示] [编辑][删除]    │
│          │ [牙刷]   [排序:5] [显示] [编辑][删除]    │
│          │                                           │
│          │                            [+ 新增二级分类] │
└──────────┴───────────────────────────────────────────┘
```

### 组件映射

| 区域 | Ant Design 组件 | 说明 |
|------|-----------------|------|
| 新增按钮 | `<a-button type="primary" @click="handleAdd(null)">新增一级分类</a-button>` | 右上角。如果选中了一级分类，文字变为 "新增二级分类" |
| 左侧列表 | `<a-list>` 或自定义 `<div>` | 一级分类文字列表，选中高亮 |
| 右侧表格 | `<a-table>` | 二级分类列表 |
| 分类名称 | `<a-input v-model:value="record.name" size="small" @blur="handleUpdate" />` | 行内可编辑 |
| 排序 | `<a-input-number v-model:value="record.sort_order" size="small" :min="0" @change="handleUpdate" />` | 行内编辑 |
| 是否展示 | `<a-switch v-model:checked="record.show_in_client" size="small" @change="handleUpdate" />` | 行内开关 |
| 编辑 | `<a-button type="link" size="small" @click="handleEdit(record)">编辑</a-button>` | 打开 Modal 编辑 |
| 删除 | `<a-button type="link" danger size="small" @click="handleDelete(record.id)">删除</a-button>` | 有子级时禁用 + Tooltip 提示 |
| 新增分类 | `<a-button type="dashed" block @click="handleAdd(parentId)">+ 新增分类</a-button>` | 右侧底部 |

### 新增/编辑 Modal

| 区域 | Ant Design 组件 | 说明 |
|------|-----------------|------|
| Modal | `<a-modal v-model:open="modalVisible" title="新增/编辑分类">` | 弹窗表单 |
| 父级选择 | `<a-form-item label="父级分类">` + `<a-select>` | 新增二级分类时选择父级 |
| 分类名称 | `<a-form-item label="分类名称" required>` + `<a-input>` | 必填 |
| 排序 | `<a-form-item label="排序">` + `<a-input-number>` | 数字，越小越靠前 |
| 是否展示 | `<a-form-item label="用户端展示">` + `<a-switch>` | 是否在 H5 端显示 |

### 交互逻辑

1. 页面加载 → 调用 `GET /api/admin/categories` → 构建树形数据
2. 点击左侧一级分类 → 右侧显示该一级分类下的二级分类列表
3. 点击一级分类（右侧无二级时）→ 显示空表格
4. 点击新增 → 打开 Modal，如果是新增二级分类则自动设置 parent_id
5. 点击编辑 → 打开 Modal，回显数据
6. 点击删除 → 检查是否有子级 → 有则禁止删除 + 提示；无则 Popconfirm 确认 → `DELETE /api/admin/categories/:id`
7. 行内编辑（名称/排序/展示） → blur 时自动保存 `PUT /api/admin/categories/:id`

---

## 5. 订单管理

### 5.1 订单列表页

### 交互文档描述

搜索（订单号 + 用户手机号 + 状态筛选） + Table（订单号/用户/金额/状态/商品数/时间/操作）

### 页面布局

```
┌──────────────────────────────────────────────────────┐
│  订单管理                                            │
├──────────────────────────────────────────────────────┤
│  ┌──────────┬──────────┬──────────┐                  │ ← 搜索区
│  │ 订单号    │ 用户手机号│ 状态      │                  │
│  │ [输入框] │ [输入框] │ [下拉]   │                  │
│  └──────────┴──────────┴──────────┘                  │
├──────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────┐│
│  │ 订单号 │ 用户 │ 金额 │ 状态 │ 商品数 │ 时间 │ 操作│ │ ← Table
│  ├────────┼──────┼──────┼──────┼────────┼──────┼────┤│
│  │ 2026...│ 138..│ ¥150 │ 待发货│ 3      │ 14:30│ 查看││
│  │        │      │      │      │        │      │ 发货││
│  └──────────────────────────────────────────────────┘│
│  分页器                                              │
└──────────────────────────────────────────────────────┘
```

### 组件映射

| 区域 | Ant Design 组件 | 说明 |
|------|-----------------|------|
| 搜索表单 | `<a-form layout="inline">` | 3 个查询字段 |
| 订单号搜索 | `<a-input v-model:value="query.order_no" placeholder="订单号" allow-clear>` | 精确搜索 |
| 手机号搜索 | `<a-input v-model:value="query.user_phone" placeholder="用户手机号" allow-clear>` | 模糊搜索 |
| 状态下拉 | `<a-select v-model:value="query.status" placeholder="全部状态" allow-clear>` | 5 个状态选项 |
| Table | `<a-table :columns="columns" :data-source="list" :pagination="pagination">` | |
| 订单号 | `<a @click="handleView(record.id)">{{ record.order_no }}</a>` | 可点击跳转详情 |
| 用户 | 手机号（脱敏显示：`138****0000`） | |
| 状态 | `<a-tag>` | 颜色同 Dashboard |
| 操作列 | `<a-space>` | 查看 + 发货（待发货状态时显示） |
| 查看 | `<a-button type="link">查看</a-button>` | 跳转详情页 |
| 发货 | `<a-button type="link" @click="handleShip(record.id)">发货</a-button>` | 打开发货 Modal |

### 发货 Modal

| 区域 | Ant Design 组件 | 说明 |
|------|-----------------|------|
| Modal | `<a-modal v-model:open="shipVisible" title="订单发货">` | 发货弹窗 |
| 物流单号 | `<a-form-item label="物流单号" required>` + `<a-input v-model:value="shippingNo">` | 必填 |
| 确认按钮 | `<a-button type="primary" @click="confirmShip">确认发货</a-button>` | 提交 |

### 交互逻辑

1. 页面加载 → 调用 `GET /api/admin/orders`
2. 搜索 → 带参数刷新
3. 点击订单号/查看 → `router.push('/admin/orders/' + id)`
4. 点击发货 → 打开 Modal → 输入物流单号 → 确认 → `POST /api/admin/orders/:id/ship` → 刷新

---

### 5.2 订单详情页

### 交互文档描述

订单信息 + 收货地址 + 商品列表 + 总金额 + 状态 + 物流信息 + 操作（取消订单/修改状态/填写物流单号）

### 页面布局

```
┌──────────────────────────────────────────────────────┐
│  ← 返回             订单详情                           │
├──────────────────────────────────────────────────────┤
│  订单信息                                            │
│  ┌──────────────────────────────────────────────────┐│
│  │ 订单号: 20260602143000123456                      ││
│  │ 下单时间: 2026-06-02 14:30:00                     ││
│  │ 订单状态: [待发货]（Tag）                          ││
│  │ 用户手机: 13800000000                             ││
│  └──────────────────────────────────────────────────┘│
├──────────────────────────────────────────────────────┤
│  收货地址                                            │
│  ┌──────────────────────────────────────────────────┐│
│  │ 张三  13800000000                                 ││
│  │ 广东省深圳市南山区xxx街道xxx号                     ││
│  └──────────────────────────────────────────────────┘│
├──────────────────────────────────────────────────────┤
│  商品列表                                            │
│  ┌──────────────────────────────────────────────────┐│
│  │ 商品图片 │ 商品名称 │ 规格 │ 单价 │ 数量 │ 小计   ││
│  │ [图]     │ 商品A    │ 个   │ ¥1.50│ 100  │ ¥150  ││
│  │ [图]     │ 商品B    │ 包   │ ¥12  │ 10   │ ¥120  ││
│  └──────────────────────────────────────────────────┘│
──────────────────────────────────────────────────────┤
│  订单总金额: ¥270.00                                 │
│  备注: 请尽快发货                                     │
├──────────────────────────────────────────────────────┤
│  物流信息                                            │
│  物流单号: SF1234567890（未发货时显示"未发货"）       │
├──────────────────────────────────────────────────────┤
│  操作: [取消订单] [修改状态] [填写物流单号]            │
└──────────────────────────────────────────────────────┘
```

### 组件映射

| 区域 | Ant Design 组件 | 说明 |
|------|-----------------|------|
| 返回 | `<a-button @click="router.back()">返回</a-button>` | |
| 订单信息 | `<a-descriptions :column="2" bordered>` | 描述列表组件 |
| 收货地址 | `<a-card title="收货地址">` | 卡片展示 |
| 商品列表 | `<a-table :columns="itemColumns" :data-source="items" :pagination="false">` | 商品明细表格 |
| 商品图片 | `<a-image :src="record.main_image" :width="48" :height="48" />` | |
| 订单总金额 | `<a-statistic title="订单总金额" :value="totalAmount" prefix="¥" />` | |
| 物流信息 | `<a-descriptions>` 或 `<a-card>` | |
| 取消订单 | `<a-button danger @click="handleCancel">取消订单</a-button>` | Popconfirm 确认 |
| 修改状态 | `<a-dropdown>` | 下拉菜单选择目标状态 |
| 填写物流单号 | `<a-button @click="shipVisible = true">填写物流单号</a-button>` | 打开发货 Modal（同列表页） |

### 交互逻辑

1. 页面加载 → 调用 `GET /api/admin/orders/:id`
2. 取消订单 → Popconfirm → `POST /api/admin/orders/:id/cancel` → 刷新
3. 修改状态 → 选择目标状态 → 确认后调用 `PATCH /api/admin/orders/:id/status`
4. 填写物流单号 → Modal 输入 → `POST /api/admin/orders/:id/ship` → 刷新

---

## 6. 用户管理

### 交互文档描述

搜索（手机号/用户编号） + Table（用户编号/手机号/用户名/状态/注册时间/操作） + 新增用户

### 页面布局

```
┌──────────────────────────────────────────────────────┐
│  用户管理                              [+ 新增用户]    │
├──────────────────────────────────────────────────────┤
│  ┌──────────┬──────────┐                             │ ← 搜索区
│  │ 手机号    │ 关键词    │                             │
│  │ [输入框] │ [输入框] │                             │
│  └──────────┴──────────┘                             │
├──────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────┐│
│  │ 用户编号 │ 手机号 │ 用户名 │ 状态 │ 注册时间 │ 操作│ │ ← Table
│  ├──────────┼────────┼────────┼──────┼──────────┼────┤│
│  │ 18266    │ 138... │ 李静  │ 启用 │ 2026-06-01│ 禁用││
│  │          │        │       │      │          │ 重置││
│  └──────────────────────────────────────────────────┘│
│  分页器                                              │
└──────────────────────────────────────────────────────┘
```

### 组件映射

| 区域 | Ant Design 组件 | 说明 |
|------|-----------------|------|
| 新增按钮 | `<a-button type="primary" @click="addVisible = true">新增用户</a-button>` | |
| 搜索表单 | `<a-form layout="inline">` | 2 个查询字段 |
| 手机号 | `<a-input v-model:value="query.phone" placeholder="手机号" allow-clear>` | |
| 关键词 | `<a-input v-model:value="query.keyword" placeholder="用户编号/用户名" allow-clear>` | |
| Table | `<a-table :columns="columns" :data-source="list" :pagination="pagination">` | |
| 状态 | `<a-switch v-model:checked="record.status === 'active'" @change="handleStatusChange" />` | 启用/禁用 |
| 操作列 | `<a-space>` | 禁用/启用 + 重置密码 |
| 禁用/启用 | `<a-button type="link" @click="handleToggleStatus(record)">{{ record.status === 'active' ? '禁用' : '启用' }}</a-button>` | Popconfirm 确认 |
| 重置密码 | `<a-button type="link" @click="handleResetPassword(record.id)">重置密码</a-button>` | 打开密码重置 Modal |

### 新增用户 Modal

| 区域 | Ant Design 组件 | 说明 |
|------|-----------------|------|
| Modal | `<a-modal v-model:open="addVisible" title="新增用户">` | |
| 用户名 | `<a-form-item label="用户名" required>` + `<a-input>` | |
| 手机号 | `<a-form-item label="手机号" required>` + `<a-input>` | 格式校验 |
| 初始密码 | `<a-form-item label="初始密码" required>` + `<a-input-password>` | 最小 6 位 |

### 重置密码 Modal

| 区域 | Ant Design 组件 | 说明 |
|------|-----------------|------|
| Modal | `<a-modal v-model:open="resetVisible" title="重置密码">` | |
| 新密码 | `<a-form-item label="新密码" required>` + `<a-input-password>` | 最小 6 位 |

### 交互逻辑

1. 页面加载 → 调用 `GET /api/admin/users`
2. 新增用户 → Modal 表单 → `POST /api/admin/users`（调用 Supabase Admin API 创建 auth 用户 + profiles 记录）
3. 禁用/启用 → Popconfirm → `PATCH /api/admin/users/:id/status`
4. 重置密码 → Modal 输入新密码 → `POST /api/admin/users/:id/reset-password`（调用 Supabase Admin API）

---

## 7. 首页配置

### 交互文档描述

Banner（图片 + 跳转链接 + 排序） + 金刚区（图标 + 名称 + 跳转链接 + 排序） + 热销商品（商品选择器多选）

### 页面布局

```
──────────────────────────────────────────────────────┐
│  首页配置                                            │
├──────────────────────────────────────────────────────┤
│  Banner 管理                                         │
│  ──────────────────────────────────────────────────┐│
│  │ 图片 │ 跳转链接 │ 排序 │ 启用 │ 操作               ││ ← Banner 表格
│  │ [图] │ /product/1│ 1   │ 开关 │ 编辑 删除         ││
│  │ [图] │ /category│ 2   │ 开关 │ 编辑 删除         ││
│  │                            [+ 新增 Banner]        ││
│  └──────────────────────────────────────────────────┘│
├──────────────────────────────────────────────────────┤
│  金刚区管理                                          │
│  ┌──────────────────────────────────────────────────┐│
│  │ 图标 │ 名称 │ 跳转链接 │ 排序 │ 启用 │ 操作       ││ ← 金刚区表格
│  │ [图] │ 爆品 │ /products│ 1   │ 开关 │ 编辑 删除  ││
│  │ [图] │ 新品 │ /products│ 2   │ 开关 │ 编辑 删除  ││
│  │                            [+ 新增金刚区]         ││
│  └──────────────────────────────────────────────────┘│
├──────────────────────────────────────────────────────┤
│  热销推荐商品                                        │
│  ┌──────────────────────────────────────────────────┐│
│  │ [商品选择器（多选，可搜索）]                       ││
│  │ 已选: 商品A(排序1)  商品B(排序2)  商品C(排序3)    ││
│  └──────────────────────────────────────────────────┘│
├──────────────────────────────────────────────────────┤
│                    [保存全部配置]                      │
└──────────────────────────────────────────────────────┘
```

### 组件映射

| 区域 | Ant Design 组件 | 说明 |
|------|-----------------|------|
| Banner 表格 | `<a-table>` | 图片列 + 链接列 + 排序列 + 启用开关 + 操作 |
| 新增 Banner | `<a-button type="dashed" block @click="handleAddBanner">+ 新增 Banner</a-button>` | 表格下方 |
| Banner Modal | `<a-modal title="新增/编辑 Banner">` | 图片上传 + 链接输入 + 排序输入 |
| 金刚区表格 | `<a-table>` | 同 Banner 结构 |
| 新增金刚区 | `<a-button type="dashed" block @click="handleAddIcon">+ 新增金刚区</a-button>` | |
| 金刚区 Modal | `<a-modal title="新增/编辑金刚区">` | 图标上传 + 名称输入 + 链接输入 + 排序输入 |
| 热销商品 | `<a-select mode="multiple" :options="productOptions" show-search>` | 多选 + 可搜索 |
| 排序调整 | 拖拽排序或手动输入排序值 | 可使用 `@dnd-kit` 或手动输入 |
| 保存全部 | `<a-button type="primary" block @click="handleSaveAll">保存全部配置</a-button>` | 底部 |

### 交互逻辑

1. 页面加载 → 调用 `GET /api/admin/home-config`
2. Banner 增删改 → 本地更新列表 → 保存时调用 `PUT /api/admin/home-config/banners`
3. 金刚区增删改 → 本地更新列表 → 保存时调用 `PUT /api/admin/home-config/quick-icons`
4. 热销商品选择 → 更新本地列表 → 保存时调用 `PUT /api/admin/home-config/products`
5. 保存全部 → 批量调用 3 个更新接口或一个聚合接口

---

## 8. 系统设置

### 交互文档描述

商家简介（富文本） + 商家公告（富文本） + 买家须知（富文本）

### 页面布局

```
┌──────────────────────────────────────────────────────┐
│  系统设置                                            │
├──────────────────────────────────────────────────────┤
│  商家简介                                            │
│  ┌──────────────────────────────────────────────────┐│
│  │ [富文本编辑器]                                     ││
│  │ （toolbar + 编辑区域）                             ││
│  ──────────────────────────────────────────────────┘│
├──────────────────────────────────────────────────────┤
│  商家公告                                            │
│  ┌──────────────────────────────────────────────────┐│
│  │ [富文本编辑器]                                     ││
│  └──────────────────────────────────────────────────┘│
├──────────────────────────────────────────────────────┤
│  买家须知                                            │
│  ┌──────────────────────────────────────────────────┐│
│  │ [富文本编辑器]                                     ││
│  └──────────────────────────────────────────────────┘│
├──────────────────────────────────────────────────────┤
│                    [保存设置]                         │
└──────────────────────────────────────────────────────┘
```

### 组件映射

| 区域 | Ant Design 组件 | 说明 |
|------|-----------------|------|
| 商家简介 | `<a-card title="商家简介">` + 富文本编辑器 | |
| 商家公告 | `<a-card title="商家公告">` + 富文本编辑器 | |
| 买家须知 | `<a-card title="买家须知">` + 富文本编辑器 | |
| 富文本编辑器 | `@wangeditor/editor` 或 `vue-quill-editor` | 推荐 wangEditor，支持图片上传 |
| 保存按钮 | `<a-button type="primary" block @click="handleSave">保存设置</a-button>` | 底部 |

### 富文本编辑器配置

- 基础工具栏：加粗、斜体、下划线、列表、链接、图片
- 图片上传：集成 `POST /api/upload`
- 字数限制：可选

### 交互逻辑

1. 页面加载 → 调用 `GET /api/admin/settings` → 回显 3 个富文本编辑器
2. 编辑内容 → 实时同步到本地 state
3. 保存 → `PUT /api/admin/settings`（提交 3 个 key 的值）→ `message.success('保存成功')`

---

## 9. 文件上传组件规范

> 交互文档有专门的"文件上传"章节，此处独立说明。

### 上传规则

| 规则 | 说明 |
|------|------|
| 最大大小 | 5MB |
| 支持格式 | jpg / png / webp |
| 上传接口 | `POST /api/upload`（multipart/form-data） |
| 返回格式 | `{ "code": 0, "data": { "url": "https://..." } }` |

### 通用上传组件（UploadImage）

所有需要上传图片的地方（商品主图、Banner、金刚区图标等）复用同一个封装组件。

```tsx
// admin/src/components/UploadImage/index.tsx
import { useState } from 'react'
import { Upload, message } from 'antd'
import { LoadingOutlined, PlusOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd/es/upload/interface'

interface Props {
  value?: string        // 受控：当前图片 URL
  onChange?: (url: string) => void  // 受控：图片 URL 变化回调
  maxCount?: number     // 最大上传数量，默认 1
}

function UploadImage({ value, onChange, maxCount = 1 }: Props) {
  const [loading, setLoading] = useState(false)

  const beforeUpload = (file: File) => {
    // 校验格式
    const isImage = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    if (!isImage) {
      message.error('只能上传 JPG/PNG/WEBP 格式的图片！')
      return false
    }
    // 校验大小
    const isLt5M = file.size / 1024 / 1024 < 5
    if (!isLt5M) {
      message.error('图片大小不能超过 5MB！')
      return false
    }
    return true
  }

  const customRequest = async ({ file, onSuccess, onError }: any) => {
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await uploadImage(formData)  // 调用 POST /api/upload
      onChange?.(res.url)
      onSuccess?.(res)
    } catch (err) {
      onError?.(err)
      message.error('上传失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Upload
      name="file"
      listType="picture-card"
      showUploadList={false}
      beforeUpload={beforeUpload}
      customRequest={customRequest}
      maxCount={maxCount}
    >
      {value ? (
        <img src={value} alt="avatar" style={{ width: '100%' }} />
      ) : (
        <div>
          {loading ? <LoadingOutlined /> : <PlusOutlined />}
          <div style={{ marginTop: 8 }}>上传</div>
        </div>
      )}
    </Upload>
  )
}
```

### 使用场景

| 页面 | 组件位置 | 说明 |
|------|---------|------|
| 商品编辑页 | 基础信息表单 | 单图上传，`maxCount=1` |
| Banner 管理 | Modal 表单 | 单图上传 |
| 金刚区管理 | Modal 表单 | 单图上传（可选，默认用 Emoji） |

---

## 10. 后台安全体系

> 交互文档有完整的校验流程和拦截规则表格，此处独立说明。

### 10.1 权限模型

```
only admin can access backend
```

### 10.2 校验流程

```
请求到达管理后台
  │
  ├── 1. 检查 localStorage 是否有 admin token
  │     │
  │     ├── 无 → 跳转 /admin/login
  │     │
  │     └── 有 → 继续
  │
  ├── 2. 请求 API 携带 Authorization: Bearer <token>
  │     │
  │     ├── Token 无效 → API 返回 401 → 清除 token → 跳转 /admin/login
  │     │
  │     └── Token 有效 → 继续
  │
  ├── 3. 中间件校验 user.role === 'admin'
  │     │
  │     ├── 非 admin → API 返回 403 → 清除 token → 强制退出 → 跳转 /admin/login
  │     │
  │     └── admin → 通过
  │
  └── 4. 中间件校验 user.status === 'active'
        │
        ├── 禁用 → API 返回 403 → 清除 token → 强制退出
        │
        └── 启用 → 允许访问
```

### 10.3 拦截规则

| 场景 | 行为 | 触发位置 |
|------|------|---------|
| 未登录 | 跳转 /admin/login | 路由守卫（前端） + API 401 响应拦截器 |
| 非 admin | 强制退出 + 跳转 /admin/login | API 403 响应拦截器 |
| Token 失效 | 清除 session + 跳转 /admin/login | API 401 响应拦截器 |
| 账号禁用 | 强制退出 + 跳转 /admin/login | API 403 响应拦截器 |

### 10.4 路由守卫实现

```tsx
// admin/src/router/guard.tsx
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { token, user, loading } = useAuthStore()
  
  if (loading) return <Spin />
  if (!token) return <Navigate to="/admin/login" replace />
  if (user?.role !== 'admin') {
    useAuthStore.getState().logout()  // 清除 token
    return <Navigate to="/admin/login" replace />
  }
  
  return <>{children}</>
}

// 路由配置
<Route path="/admin/dashboard" element={
  <AdminRoute><Dashboard /></AdminRoute>
} />
```

### 10.5 API 响应拦截器

```typescript
// admin/src/api/request.ts
request.interceptors.response.use(
  (response) => {
    const { data } = response
    if (data.code === 401) {
      // 未登录
      useAuthStore.getState().logout()
      window.location.href = '/admin/login'
      return Promise.reject(new Error(data.message))
    }
    if (data.code === 403) {
      // 无权限（非 admin 或 账号禁用）
      useAuthStore.getState().logout()
      window.location.href = '/admin/login'
      message.error(data.message)
      return Promise.reject(new Error(data.message))
    }
    if (data.code !== 0) {
      message.error(data.message || '请求失败')
      return Promise.reject(new Error(data.message))
    }
    return data
  },
  (error) => {
    message.error('网络异常，请稍后重试')
    return Promise.reject(error)
  }
)
```
