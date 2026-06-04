管理后台 UI & 交互文档

0️⃣ 全局规则（强制）
0.1 访问权限
仅 role = admin 可访问
非 admin：
禁止登录后台
禁止访问 /admin/*
API 返回 403
0.2 登录拦截
未登录 → 跳转 /admin/login
token 无效 → 自动退出
role 非 admin → 强制退出
0.3 API统一规则
{
  "code": 0,
  "message": "success",
  "data": {}
}

错误：

{ "code": 401, "message": "未登录" }
{ "code": 403, "message": "无权限访问后台" }
1️⃣ 管理员登录页
页面结构
系统Logo
标题：管理后台
手机号输入框（必填）
密码输入框（必填）
登录按钮
交互逻辑
登录
POST /api/admin/login

请求：

{
  "phone": "13800000000",
  "password": "123456"
}
登录校验流程
校验账号是否存在
校验密码
校验 role === admin
校验账号是否禁用
成功
返回 token
跳转 /admin/dashboard
失败
场景	提示
非管理员	无权限登录
密码错误	密码错误
账号不存在	账号不存在
账号禁用	账号已被禁用
2️⃣ Dashboard 首页
页面元素
用户总数卡片
商品总数卡片
订单总数卡片
今日订单金额
最近订单列表（5条）
最近订单列表字段
订单号
用户手机号
金额
状态
时间
交互
加载 → GET /api/admin/dashboard
点击订单 → 进入订单详情页
3️⃣ 商品管理
3.1 商品列表页
页面元素
搜索区
商品名称输入框
商品编号输入框
分类下拉
状态筛选（上架/下架）
表格
字段	说明
图片	商品主图
名称	可点击
编号	product_no
条码	barcode
分类	一级/二级
价格区间	最低~最高规格
库存	汇总
销量	sales_count
状态	上/下架
操作	编辑/删除
按钮
新增商品
编辑
删除
上架/下架
交互
查询 → GET /api/admin/products
删除 → DELETE /api/admin/products/{id}
状态切换 → PATCH /status
3.2 商品编辑页
基础信息
商品名称（必填）
商品编号（自动生成）
条码
分类（一级/二级）
商品主图上传
商品详情富文本
规格管理（核心）
规格表
字段	说明
规格名称	如：件/箱
单价	decimal
库存	int
最低起订量	int
操作
新增规格
删除规格
修改规格
交互
保存 → POST/PUT /api/admin/products
上传图片 → /api/upload
4️⃣ 分类管理
页面结构
左侧：一级分类
右侧：二级分类
字段
分类名称
排序
是否展示
操作
新增分类
编辑分类
删除分类（必须无子级）
API
GET /categories
POST /categories
PUT /categories/{id}
DELETE /categories/{id}
5️⃣ 订单管理
5.1 订单列表
搜索
订单号
用户手机号
状态筛选
待付款
待发货
待收货
已完成
已取消
表格字段
字段	说明
订单号	可点击
用户	手机号
金额	total_amount
状态	status
商品数	items
时间	created_at
操作	查看/发货
操作
发货

弹窗：

物流单号输入框
确认按钮

API：

POST /api/admin/orders/{id}/ship
查看订单

进入订单详情页

5.2 订单详情页
内容
订单信息
收货地址
商品列表
总金额
状态
物流信息
操作
取消订单
修改状态
填写物流单号
6️⃣ 用户管理
页面元素
搜索（手机号/用户编号）
表格
字段	说明
用户编号	id
手机号	phone
用户名	username
状态	启用/禁用
注册时间	created_at
操作
新增用户
禁用/启用
重置密码
API
GET /users
POST /users
PATCH /users/{id}/status
7️⃣ 首页配置
模块
Banner
图片
跳转链接
排序
金刚区
图标
名称
跳转链接
热销商品
商品选择器（多选）
API
GET /home-config
PUT /home-config
8️⃣ 系统设置
内容
商家简介（富文本）
商家公告
买家须知
API
GET /settings
PUT /settings
9️⃣ 文件上传
规则
图片上传
最大5MB
支持 jpg/png/webp
API
POST /api/upload

返回：

{
  "url": "https://..."
}
🔟 后台安全体系（最终版）
权限模型
only admin can access backend
校验流程
token存在 → 校验user → 校验role → admin通过
拦截规则
场景	行为
未登录	跳登录
非admin	强制退出
token失效	清除session