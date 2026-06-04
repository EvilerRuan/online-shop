import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env } from './types/env'
import { errorHandler } from './middleware/error-handler'
import { authMiddleware } from './middleware/auth'
import { adminMiddleware } from './middleware/admin'
import authRoutes from './routes/auth'
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

const app = new Hono<Env>()

// 全局中间件
app.use('*', cors())
app.onError(errorHandler)

// 公开路由
app.route('/api/auth', authRoutes)
app.route('/api/settings', settingsRoutes)
app.route('/api/admin/login', adminLoginRoutes)

// 需要认证的路由
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

// 管理员路由
app.use('/api/admin/*', adminMiddleware)
app.route('/api/admin', adminRoutes)

export default app
