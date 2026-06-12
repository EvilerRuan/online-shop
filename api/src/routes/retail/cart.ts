import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { Env } from '../../types/env'
import { createAdminClient } from '../../utils/supabase'
import { success, error } from '../../utils/response'

const cart = new Hono<Env>()

// GET / - 获取购物车列表
cart.get('/', async (c) => {
  const user = c.get('user')
  const db = createAdminClient(c.env)

  const { data: cartItems, error: cartErr } = await db
    .from('retail_cart')
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

  // 查询商品信息
  const { data: products } = await db
    .from('products')
    .select('id, name, main_image, price, stock')
    .in('id', productIds)

  // 查询 SKU 信息
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
      product_id: item.product_id,
      sku_id: item.sku_id,
      product_name: product?.name || '',
      sku_name: sku?.sku_name || '',
      main_image: product?.main_image || null,
      price: Number(product?.price || 0),
      stock: product?.stock || 0,
      quantity: item.quantity,
      remark: item.remark || '',
    }
  })

  return success(c, list)
})

// POST / - 加入购物车
cart.post(
  '/',
  zValidator(
    'json',
    z.object({
      product_id: z.number().int().positive(),
      sku_id: z.number().int().positive().optional(),
      quantity: z.number().int().positive(),
      remark: z.string().optional(),
    }),
  ),
  async (c) => {
    const user = c.get('user')
    const { product_id, sku_id: providedSkuId, quantity, remark } = c.req.valid('json')
    const db = createAdminClient(c.env)

    // 查询商品
    const { data: product } = await db
      .from('products')
      .select('id, stock')
      .eq('id', product_id)
      .single()

    // 如果没有提供 sku_id，查询商品的第一个 SKU
    let skuId = providedSkuId
    if (!skuId) {
      const { data: firstSku } = await db
        .from('product_skus')
        .select('id, quantity')
        .eq('product_id', product_id)
        .order('sort_order', { ascending: true })
        .limit(1)
        .single()

      if (!firstSku) {
        return error(c, 404, '商品规格不存在', 404)
      }
      skuId = firstSku.id
    }

    const { data: sku } = await db
      .from('product_skus')
      .select('id, quantity')
      .eq('id', skuId)
      .single()

    if (!sku) {
      return error(c, 404, '商品规格不存在', 404)
    }

    // 检查是否已存在相同 user+product+sku
    const { data: existing } = await db
      .from('retail_cart')
      .select('id, quantity')
      .eq('user_id', user.id)
      .eq('product_id', product_id)
      .eq('sku_id', skuId)
      .maybeSingle()

    if (existing) {
      const newQty = existing.quantity + quantity
      if (product && newQty > product.stock) {
        return error(c, 409, `库存不足，当前库存 ${product.stock}`, 409)
      }
      const { error: updateErr } = await db
        .from('retail_cart')
        .update({ quantity: newQty })
        .eq('id', existing.id)
      if (updateErr) {
        return error(c, 500, '更新购物车失败', 500)
      }
      return success(c, { cart_id: existing.id })
    }

    // 新增：检查库存
    if (product && quantity > product.stock) {
      return error(c, 409, `库存不足，当前库存 ${product.stock}`, 409)
    }

    const { data: inserted, error: insertErr } = await db
      .from('retail_cart')
      .insert({
        user_id: user.id,
        product_id,
        sku_id: skuId,
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
cart.put(
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
      .from('retail_cart')
      .select('id, product_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!cartItem) {
      return error(c, 404, '购物车项不存在', 404)
    }

    // 检查库存
    const { data: product } = await db
      .from('products')
      .select('stock')
      .eq('id', cartItem.product_id)
      .single()

    if (product && quantity > product.stock) {
      return error(c, 409, `库存不足，当前库存 ${product.stock}`, 409)
    }

    const { data: updated, error: updateErr } = await db
      .from('retail_cart')
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
cart.delete('/:id', async (c) => {
  const user = c.get('user')
  const id = Number(c.req.param('id'))
  const db = createAdminClient(c.env)

  // 验证购物车项属于当前用户
  const { data: cartItem } = await db
    .from('retail_cart')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!cartItem) {
    return error(c, 404, '购物车项不存在', 404)
  }

  const { error: deleteErr } = await db.from('retail_cart').delete().eq('id', id)

  if (deleteErr) {
    return error(c, 500, '删除购物车项失败', 500)
  }

  return success(c, null, '删除成功')
})

export default cart
