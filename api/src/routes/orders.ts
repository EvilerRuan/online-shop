import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { Env } from '../types/env'
import { createAdminClient } from '../utils/supabase'
import { success, paginate, error } from '../utils/response'
import { ORDER_STATUS_LABEL } from 'shared/constants/order-status'
import type { OrderStatus } from 'shared/constants/order-status'

const app = new Hono<Env>()

// POST / - 创建订单
app.post(
  '/',
  zValidator(
    'json',
    z.object({
      address_id: z.number().int().positive(),
      cart_ids: z.array(z.number().int().positive()).min(1),
      remark: z.string().optional(),
    }),
  ),
  async (c) => {
    const user = c.get('user')
    const { address_id, cart_ids, remark } = c.req.valid('json')
    const db = createAdminClient(c.env)

    // 1. 验证地址属于当前用户
    const { data: address } = await db
      .from('addresses')
      .select('recipient_name, phone, province, city, district, detail')
      .eq('id', address_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!address) {
      return error(c, 404, '收货地址不存在', 404)
    }

    // 2. 查询购物车项
    const { data: cartItems } = await db
      .from('cart')
      .select('id, product_id, sku_id, quantity')
      .in('id', cart_ids)
      .eq('user_id', user.id)

    if (!cartItems || cartItems.length === 0) {
      return error(c, 400, '购物车项不存在或已被清空', 400)
    }

    if (cartItems.length !== cart_ids.length) {
      return error(c, 400, '部分购物车项不存在或不属于当前用户', 400)
    }

    // 3. 查询商品和 SKU 信息
    const productIds = [...new Set(cartItems.map((item) => item.product_id))]
    const skuIds = [...new Set(cartItems.map((item) => item.sku_id))]

    const { data: products } = await db
      .from('products')
      .select('id, name, main_image, sales_count, price, stock')
      .in('id', productIds)

    const { data: skus } = await db
      .from('product_skus')
      .select('id, product_id, sku_name')
      .in('id', skuIds)

    const productMap = new Map((products || []).map((p) => [p.id, p]))
    const skuMap = new Map((skus || []).map((s) => [s.id, s]))

    // 4. 检查库存并计算总金额
    let totalAmount = 0
    const orderItemsData: {
      product_id: number
      sku_id: number
      product_name: string
      sku_name: string
      main_image: string | null
      price: number
      quantity: number
      subtotal: number
      remark: string
    }[] = []

    for (const cartItem of cartItems) {
      const sku = skuMap.get(cartItem.sku_id)
      const product = productMap.get(cartItem.product_id)

      if (!sku || !product) {
        return error(c, 400, '商品信息不存在', 400)
      }

      if (cartItem.quantity > product.stock) {
        return error(
          c,
          409,
          `商品「${product.name}」（${sku.sku_name}）库存不足，当前库存 ${product.stock}`,
          409,
        )
      }

      const subtotal = Number(product.price) * cartItem.quantity
      totalAmount += subtotal

      orderItemsData.push({
        product_id: cartItem.product_id,
        sku_id: cartItem.sku_id,
        product_name: product.name,
        sku_name: sku.sku_name,
        main_image: product.main_image,
        price: Number(product.price),
        quantity: cartItem.quantity,
        subtotal,
        remark: '',
      })
    }

    // 5. 生成订单号
    const { data: orderNo, error: orderNoErr } = await db.rpc('generate_order_no')
    if (orderNoErr || !orderNo) {
      return error(c, 500, '生成订单号失败', 500)
    }

    const addressStr = `${address.province}${address.city}${address.district}${address.detail}`

    // 6. 插入订单
    const { data: order, error: orderErr } = await db
      .from('orders')
      .insert({
        order_no: orderNo,
        user_id: user.id,
        total_amount: totalAmount,
        status: 'pending_payment',
        remark: remark || '',
        recipient_name: address.recipient_name,
        recipient_phone: address.phone,
        address: addressStr,
      })
      .select('id, order_no')
      .single()

    if (orderErr || !order) {
      return error(c, 500, '创建订单失败', 500)
    }

    // 7. 插入订单明细
    const itemsWithOrderId = orderItemsData.map((item) => ({
      order_id: order.id,
      ...item,
    }))

    const { error: itemsErr } = await db.from('order_items').insert(itemsWithOrderId)
    if (itemsErr) {
      return error(c, 500, '创建订单明细失败', 500)
    }

    // 8. 扣减库存
    for (const cartItem of cartItems) {
      const product = productMap.get(cartItem.product_id)!
      await db
        .from('products')
        .update({ stock: product.stock - cartItem.quantity })
        .eq('id', cartItem.product_id)
    }

    // 9. 增加销量
    const productSalesMap = new Map<number, number>()
    for (const cartItem of cartItems) {
      const current = productSalesMap.get(cartItem.product_id) || 0
      productSalesMap.set(cartItem.product_id, current + cartItem.quantity)
    }

    for (const [productId, salesQty] of productSalesMap) {
      const product = productMap.get(productId)
      if (product) {
        await db
          .from('products')
          .update({ sales_count: product.sales_count + salesQty })
          .eq('id', productId)
      }
    }

    // 10. 删除已下单的购物车项
    await db.from('cart').delete().in('id', cart_ids)

    return success(c, { order_id: order.id, order_no: order.order_no })
  },
)

// GET / - 订单列表
app.get('/', async (c) => {
  const user = c.get('user')
  const db = createAdminClient(c.env)

  const status = c.req.query('status')
  const page = Math.max(1, Number(c.req.query('page')) || 1)
  const pageSize = Math.min(50, Math.max(1, Number(c.req.query('page_size')) || 10))

  let query = db
    .from('orders')
    .select('id, order_no, total_amount, status, created_at', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data: orders, error: ordersErr, count } = await query

  if (ordersErr) {
    return error(c, 500, '查询订单列表失败', 500)
  }

  if (!orders || orders.length === 0) {
    return paginate(c, [], count || 0, page, pageSize)
  }

  const orderIds = orders.map((o) => o.id)

  // 查询每个订单的前3个商品图片
  const { data: allItems } = await db
    .from('order_items')
    .select('order_id, main_image')
    .in('order_id', orderIds)
    .order('id', { ascending: true })

  // 查询每个订单的商品数量
  const itemCountMap = new Map<number, number>()
  const imageMap = new Map<number, (string | null)[]>()

  if (allItems) {
    for (const item of allItems) {
      // 计数
      itemCountMap.set(item.order_id, (itemCountMap.get(item.order_id) || 0) + 1)

      // 收集图片（前3个）
      if (!imageMap.has(item.order_id)) {
        imageMap.set(item.order_id, [])
      }
      const images = imageMap.get(item.order_id)!
      if (images.length < 3) {
        images.push(item.main_image)
      }
    }
  }

  const list = orders.map((o) => ({
    id: o.id,
    order_no: o.order_no,
    total_amount: Number(o.total_amount),
    status: o.status as OrderStatus,
    status_text: ORDER_STATUS_LABEL[o.status as OrderStatus] || o.status,
    item_count: itemCountMap.get(o.id) || 0,
    product_images: imageMap.get(o.id) || [],
    created_at: o.created_at,
  }))

  return paginate(c, list, count || 0, page, pageSize)
})

// GET /count - 订单状态计数
app.get('/count', async (c) => {
  const user = c.get('user')
  const db = createAdminClient(c.env)

  const statuses = ['pending_payment', 'pending_shipment', 'pending_receipt']
  const result: Record<string, number> = {
    pending_payment: 0,
    pending_shipment: 0,
    pending_receipt: 0,
  }

  // 并行查询各状态数量
  const promises = statuses.map(async (status) => {
    const { count } = await db
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', status)
    result[status] = count || 0
  })

  await Promise.all(promises)

  return success(c, result)
})

// GET /:id - 订单详情
app.get('/:id', async (c) => {
  const user = c.get('user')
  const id = Number(c.req.param('id'))
  const db = createAdminClient(c.env)

  const { data: order } = await db
    .from('orders')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!order) {
    return error(c, 404, '订单不存在', 404)
  }

  const { data: items } = await db
    .from('order_items')
    .select('*')
    .eq('order_id', id)
    .order('id', { ascending: true })

  // 查询 SKU 的 quantity（每件包含的商品数）
  let skuQuantityMap = new Map<number, number>()
  if (items && items.length > 0) {
    const skuIds = [...new Set(items.map((i) => i.sku_id))]
    const { data: skus } = await db
      .from('product_skus')
      .select('id, quantity')
      .in('id', skuIds)

    if (skus) {
      skuQuantityMap = new Map(skus.map((s) => [s.id, s.quantity || 1]))
    }
  }

  return success(c, {
    ...order,
    total_amount: Number(order.total_amount),
    items: (items || []).map((item) => ({
      id: item.id,
      order_id: item.order_id,
      product_id: item.product_id,
      sku_id: item.sku_id,
      product_name: item.product_name,
      sku_name: item.sku_name,
      main_image: item.main_image,
      price: Number(item.price),
      quantity: item.quantity,
      subtotal: Number(item.subtotal),
      unit_quantity: skuQuantityMap.get(item.sku_id) || 1,
      remark: item.remark,
    })),
  })
})

// POST /:id/cancel - 取消订单
app.post('/:id/cancel', async (c) => {
  const user = c.get('user')
  const id = Number(c.req.param('id'))
  const db = createAdminClient(c.env)

  const { data: order } = await db
    .from('orders')
    .select('id, status')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!order) {
    return error(c, 404, '订单不存在', 404)
  }

  if (order.status !== 'pending_payment') {
    return error(c, 400, '只有待付款订单可以取消', 400)
  }

  // 更新订单状态
  const { error: updateErr } = await db
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('id', id)

  if (updateErr) {
    return error(c, 500, '取消订单失败', 500)
  }

  // 恢复库存
  const { data: items } = await db
    .from('order_items')
    .select('product_id, quantity')
    .eq('order_id', id)

  if (items) {
    for (const item of items) {
      const { data: product } = await db
        .from('products')
        .select('stock')
        .eq('id', item.product_id)
        .single()

      if (product) {
        await db
          .from('products')
          .update({ stock: product.stock + item.quantity })
          .eq('id', item.product_id)
      }
    }
  }

  return success(c, null, '订单已取消')
})

// POST /:id/confirm - 确认收货
app.post('/:id/confirm', async (c) => {
  const user = c.get('user')
  const id = Number(c.req.param('id'))
  const db = createAdminClient(c.env)

  const { data: order } = await db
    .from('orders')
    .select('id, status')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!order) {
    return error(c, 404, '订单不存在', 404)
  }

  if (order.status !== 'pending_receipt') {
    return error(c, 400, '只有待收货订单可以确认收货', 400)
  }

  const { error: updateErr } = await db
    .from('orders')
    .update({ status: 'completed' })
    .eq('id', id)

  if (updateErr) {
    return error(c, 500, '确认收货失败', 500)
  }

  return success(c, null, '已确认收货')
})

// DELETE /:id - 删除订单
app.delete('/:id', async (c) => {
  const user = c.get('user')
  const id = Number(c.req.param('id'))
  const db = createAdminClient(c.env)

  const { data: order } = await db
    .from('orders')
    .select('id, status')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!order) {
    return error(c, 404, '订单不存在', 404)
  }

  if (order.status !== 'cancelled') {
    return error(c, 400, '只有已取消订单可以删除', 400)
  }

  // 删除订单明细
  const { error: itemsErr } = await db
    .from('order_items')
    .delete()
    .eq('order_id', id)

  if (itemsErr) {
    return error(c, 500, '删除订单明细失败', 500)
  }

  // 删除订单
  const { error: orderErr } = await db
    .from('orders')
    .delete()
    .eq('id', id)

  if (orderErr) {
    return error(c, 500, '删除订单失败', 500)
  }

  return success(c, null, '订单已删除')
})

export default app
