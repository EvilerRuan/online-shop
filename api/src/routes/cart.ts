import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { Env } from '../types/env'
import { createAdminClient } from '../utils/supabase'
import { success, error } from '../utils/response'

const app = new Hono<Env>()

// GET / - 获取购物车列表
app.get('/', async (c) => {
  const user = c.get('user')
  const db = createAdminClient(c.env)

  const { data: cartItems, error: cartErr } = await db
    .from('cart')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (cartErr) {
    return error(c, 500, '查询购物车失败', 500)
  }

  if (!cartItems || cartItems.length === 0) {
    return success(c, [])
  }

  // 收集所有 product_id 和 sku_id
  const productIds = [...new Set(cartItems.map((item) => item.product_id))]
  const skuIds = [...new Set(cartItems.map((item) => item.sku_id))]

  // 查询商品信息（price, stock, min_order_qty 现在在 products 表）
  const { data: products } = await db
    .from('products')
    .select('id, name, main_image, price, stock, min_order_qty')
    .in('id', productIds)

  // 查询 SKU 信息（只包含 sku_name 和 quantity）
  const { data: skus } = await db
    .from('product_skus')
    .select('id, sku_name, quantity')
    .in('id', skuIds)

  const productMap = new Map((products || []).map((p) => [p.id, p]))
  const skuMap = new Map((skus || []).map((s) => [s.id, s]))

  const list = cartItems.map((item) => {
    const product = productMap.get(item.product_id)
    const sku = skuMap.get(item.sku_id)
    return {
      id: item.id,
      product: {
        id: item.product_id,
        name: product?.name || '',
        main_image: product?.main_image || null,
      },
      sku: {
        id: item.sku_id,
        sku_name: sku?.sku_name || '',
        price: Number(product?.price || 0),
        stock: product?.stock || 0,
        min_order_qty: product?.min_order_qty || 1,
        quantity: sku?.quantity || 1,
      },
      quantity: item.quantity,
      subtotal: Number(product?.price || 0) * item.quantity,
      remark: item.remark || '',
    }
  })

  return success(c, list)
})

// POST / - 加入购物车
app.post(
  '/',
  zValidator(
    'json',
    z.object({
      product_id: z.number().int().positive(),
      sku_id: z.number().int().positive(),
      quantity: z.number().int().positive(),
      remark: z.string().optional(),
    }),
  ),
  async (c) => {
    const user = c.get('user')
    const { product_id, sku_id, quantity, remark } = c.req.valid('json')
    const db = createAdminClient(c.env)

    // 查询商品和 SKU 信息
    const { data: product } = await db
      .from('products')
      .select('id, stock, min_order_qty')
      .eq('id', product_id)
      .single()

    const { data: sku } = await db
      .from('product_skus')
      .select('id, quantity')
      .eq('id', sku_id)
      .single()

    if (!sku) {
      return error(c, 404, '商品规格不存在', 404)
    }

    // 检查是否已存在相同 user+product+sku
    const { data: existing } = await db
      .from('cart')
      .select('id, quantity')
      .eq('user_id', user.id)
      .eq('product_id', product_id)
      .eq('sku_id', sku_id)
      .maybeSingle()

    if (existing) {
      const newQty = existing.quantity + quantity
      if (product && newQty > product.stock) {
        return error(c, 409, `库存不足，当前库存 ${product.stock}`, 409)
      }
      const { error: updateErr } = await db
        .from('cart')
        .update({ quantity: newQty })
        .eq('id', existing.id)
      if (updateErr) {
        return error(c, 500, '更新购物车失败', 500)
      }
      return success(c, { cart_id: existing.id })
    }

    // 新增：检查库存和最低起订量
    if (product) {
      if (quantity > product.stock) {
        return error(c, 409, `库存不足，当前库存 ${product.stock}`, 409)
      }
      if (quantity < product.min_order_qty) {
        return error(c, 400, `最低起订量为 ${product.min_order_qty}`, 400)
      }
    }

    const { data: inserted, error: insertErr } = await db
      .from('cart')
      .insert({
        user_id: user.id,
        product_id,
        sku_id,
        quantity,
        remark: remark || '',
      })
      .select('id')
      .single()

    if (insertErr) {
      return error(c, 500, '添加购物车失败', 500)
    }

    return success(c, { cart_id: inserted.id })
  },
)

// PUT /:id - 更新购物车数量
app.put(
  '/:id',
  zValidator(
    'json',
    z.object({
      quantity: z.number().int().min(1),
    }),
  ),
  async (c) => {
    const user = c.get('user')
    const id = Number(c.req.param('id'))
    const { quantity } = c.req.valid('json')
    const db = createAdminClient(c.env)

    // 验证购物车项属于当前用户
    const { data: cartItem } = await db
      .from('cart')
      .select('id, product_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!cartItem) {
      return error(c, 404, '购物车项不存在', 404)
    }

    // 检查库存（库存现在在 products 表）
    const { data: product } = await db
      .from('products')
      .select('stock')
      .eq('id', cartItem.product_id)
      .single()

    if (product && quantity > product.stock) {
      return error(c, 409, `库存不足，当前库存 ${product.stock}`, 409)
    }

    const { data: updated, error: updateErr } = await db
      .from('cart')
      .update({ quantity })
      .eq('id', id)
      .select()
      .single()

    if (updateErr) {
      return error(c, 500, '更新购物车失败', 500)
    }

    return success(c, updated)
  },
)

// DELETE /:id - 删除购物车项
app.delete('/:id', async (c) => {
  const user = c.get('user')
  const id = Number(c.req.param('id'))
  const db = createAdminClient(c.env)

  // 验证购物车项属于当前用户
  const { data: cartItem } = await db
    .from('cart')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!cartItem) {
    return error(c, 404, '购物车项不存在', 404)
  }

  const { error: deleteErr } = await db.from('cart').delete().eq('id', id)

  if (deleteErr) {
    return error(c, 500, '删除购物车项失败', 500)
  }

  return success(c, null, '删除成功')
})

export default app
