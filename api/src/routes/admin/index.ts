import { Hono } from 'hono'
import type { Env } from '../../types/env'
import dashboard from './dashboard'
import products from './products'
import categories from './categories'
import orders from './orders'
import users from './users'
import homeConfig from './home-config'
import settings from './settings'
import specNames from './spec-names'
// 零售管理模块
import shippingFees from './shipping-fees'
import points from './points'
import afterSales from './after-sales'
import customerService from './customer-service'
import retailUsers from './retail-users'
import retailHomeConfig from './retail-home-config'

const admin = new Hono<Env>()

admin.route('/dashboard', dashboard)
admin.route('/products', products)
admin.route('/categories', categories)
admin.route('/orders', orders)
admin.route('/users', users)
admin.route('/home-config', homeConfig)
admin.route('/settings', settings)
admin.route('/spec-names', specNames)
// 零售管理路由
admin.route('/shipping-fees', shippingFees)
admin.route('/points', points)
admin.route('/after-sales', afterSales)
admin.route('/customer-service', customerService)
admin.route('/retail-users', retailUsers)
admin.route('/retail-home-config', retailHomeConfig)

export default admin
