import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env } from './types/env'
import { errorHandler } from './middleware/error-handler'
import { authMiddleware } from './middleware/auth'
import { adminMiddleware } from './middleware/admin'
import { retailAuthMiddleware } from './middleware/retail-auth'
import authRoutes from './routes/auth'
import wxAuthRoutes from './routes/wx-auth'
import productRoutes from './routes/products'
import categoryRoutes from './routes/categories'
import cartRoutes from './routes/cart'
import orderRoutes from './routes/orders'
import addressRoutes from './routes/addresses'
import homeRoutes from './routes/home'
import uploadRoutes from './routes/upload'
import settingsRoutes from './routes/settings'
import adminRoutes from './routes/admin'
import adminLoginRoutes from './routes/admin-login'
// 零售端路由
import retailHomeRoutes from './routes/retail/home'
import retailProductRoutes from './routes/retail/products'
import retailCategoryRoutes from './routes/retail/categories'
import retailCartRoutes from './routes/retail/cart'
import retailAddressRoutes from './routes/retail/addresses'
import retailShippingRoutes from './routes/retail/shipping'
import retailOrderRoutes from './routes/retail/orders'
import retailAfterSalesRoutes from './routes/retail/after-sales'
import retailPointsRoutes from './routes/retail/points'
import retailMessageRoutes from './routes/retail/messages'
import retailReferralRoutes from './routes/retail/referral'
import retailProfileRoutes from './routes/retail/profile'

const app = new Hono<Env>()

// 全局中间件
app.use('*', cors())
app.onError(errorHandler)

// ============================================================
// 公开路由
// ============================================================
app.route('/api/auth', authRoutes)
app.route('/api/auth', wxAuthRoutes) // 微信登录 + 验证码登录
app.route('/api/settings', settingsRoutes)
app.route('/api/admin/login', adminLoginRoutes)

// 零售端公开路由（无需认证）
app.route('/api/retail/home', retailHomeRoutes)
app.route('/api/retail/products', retailProductRoutes)
app.route('/api/retail/categories', retailCategoryRoutes)

// ============================================================
// 零售端认证路由
// ============================================================
app.use('/api/retail/shipping/*', retailAuthMiddleware)
app.use('/api/retail/shipping', retailAuthMiddleware)
app.route('/api/retail/shipping', retailShippingRoutes)

app.use('/api/retail/orders/*', retailAuthMiddleware)
app.use('/api/retail/orders', retailAuthMiddleware)
app.route('/api/retail/orders', retailOrderRoutes)

app.use('/api/retail/cart/*', retailAuthMiddleware)
app.use('/api/retail/cart', retailAuthMiddleware)
app.route('/api/retail/cart', retailCartRoutes)

app.use('/api/retail/addresses/*', retailAuthMiddleware)
app.use('/api/retail/addresses', retailAuthMiddleware)
app.route('/api/retail/addresses', retailAddressRoutes)

app.use('/api/retail/after-sales/*', retailAuthMiddleware)
app.use('/api/retail/after-sales', retailAuthMiddleware)
app.route('/api/retail/after-sales', retailAfterSalesRoutes)

app.use('/api/retail/points/*', retailAuthMiddleware)
app.use('/api/retail/points', retailAuthMiddleware)
app.route('/api/retail/points', retailPointsRoutes)

app.use('/api/retail/messages/*', retailAuthMiddleware)
app.use('/api/retail/messages', retailAuthMiddleware)
app.route('/api/retail/messages', retailMessageRoutes)

app.use('/api/retail/referral/*', retailAuthMiddleware)
app.use('/api/retail/referral', retailAuthMiddleware)
app.route('/api/retail/referral', retailReferralRoutes)

app.use('/api/retail/profile/*', retailAuthMiddleware)
app.use('/api/retail/profile', retailAuthMiddleware)
app.route('/api/retail/profile', retailProfileRoutes)

// ============================================================
// 批发端认证路由
// ============================================================
app.use('/api/products/*', authMiddleware)
app.route('/api/products', productRoutes)

app.use('/api/categories/*', authMiddleware)
app.route('/api/categories', categoryRoutes)

app.use('/api/cart/*', authMiddleware)
app.route('/api/cart', cartRoutes)

app.use('/api/orders/*', authMiddleware)
app.route('/api/orders', orderRoutes)

app.use('/api/addresses/*', authMiddleware)
app.route('/api/addresses', addressRoutes)

app.use('/api/home/*', authMiddleware)
app.route('/api/home', homeRoutes)

app.use('/api/upload/*', authMiddleware)
app.route('/api/upload', uploadRoutes)

// ============================================================
// 管理员路由
// ============================================================
app.use('/api/admin/*', adminMiddleware)
app.route('/api/admin', adminRoutes)

export default app
