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

const admin = new Hono<Env>()

admin.route('/dashboard', dashboard)
admin.route('/products', products)
admin.route('/categories', categories)
admin.route('/orders', orders)
admin.route('/users', users)
admin.route('/home-config', homeConfig)
admin.route('/settings', settings)
admin.route('/spec-names', specNames)

export default admin
