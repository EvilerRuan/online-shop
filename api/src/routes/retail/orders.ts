import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { Env } from '../../types/env'
import { createAdminClient } from '../../utils/supabase'
import { success, paginate, error } from '../../utils/response'
import { ORDER_STATUS_LABEL } from 'shared/constants/order-status'
import type { OrderStatus } from 'shared/constants/order-status'
import { calculateShippingFee } from '../../services/shipping'
import { awardFirstPurchasePoints } from '../../services/points'

const app = new Hono<Env>()

// POST / - 创建零售订单
app.post(
  '/',
  zValidator(
    'json',
    z.object({
      address_id: z.number().int().positive(),
      items: z.array(
        z.object({
          product_id: z.number().int().positive(),
          sku_id: z.number().int().positive().optional(),
          quantity: z.number().int().positive(),
        }),
      ).min(1),
      cart_ids: z.array(z.number().int().positive()).optional(),
      remark: z.string().optional(),
    }),
  ),
  async (c) => {
    const user = c.get('user')
    const { address_id, items, cart_ids, remark } = c.req.valid('json')
    const db = createAdminClient(c.env)

    // 1. 验证地址属于当前用户（零售端使用 retail_addresses 表）
    const { data: address } = await db
      .from('retail_addresses')
      .select('recipient_name, phone, province, city, district, detail')
      .eq('id', address_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!address) {
      return error(c, 404, '收货地址不存在', 404)
    }

    // 2. 查询商品信息
    const productIds = [...new Set(items.map((item) => item.product_id))]

    const { data: products } = await db
      .from('products')
      .select('id, name, main_image, sales_count, price, stock, sales_channel, status')
      .in('id', productIds)

    const productMap = new Map((products || []).map((p) => [p.id, p]))

    // 3. 检查商品渠道和库存，计算总金额
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

    for (const item of items) {
      const product = productMap.get(item.product_id)

      if (!product) {
        return error(c, 400, '商品信息不存在', 400)
      }

      if (!['retail', 'both'].includes(product.sales_channel)) {
        return error(c, 400, `商品「${product.name}」不支持零售渠道购买`, 400)
      }

      if (product.status !== 'active') {
        return error(c, 400, `商品「${product.name}」已下架`, 400)
      }

      if (item.quantity > product.stock) {
        return error(
          c,
          409,
          `商品「${product.name}」库存不足，当前库存 ${product.stock}`,
          409,
        )
      }

      const price = Number(product.price)
      const subtotal = price * item.quantity
      totalAmount += subtotal

      orderItemsData.push({
        product_id: item.product_id,
        sku_id: item.sku_id || 0,
        product_name: product.name,
        sku_name: '',
        main_image: product.main_image,
        price,
        quantity: item.quantity,
        subtotal,
        remark: '',
      })
    }

    // 4. 计算运费
    const shippingResult = await calculateShippingFee(
      db,
      address.province,
      address.city,
      totalAmount,
    )

    // 5. 生成订单号
    const { data: orderNo, error: orderNoErr } = await db.rpc('generate_order_no')
    if (orderNoErr || !orderNo) {
      return error(c, 500, '生成订单号失败', 500)
    }

    const addressStr = `${address.province}${address.city}${address.district}${address.detail}`

    // 6. 插入订单（零售订单直接为 pending_shipment）
    const { data: order, error: orderErr } = await db
      .from('orders')
      .insert({
        order_no: orderNo,
        user_id: user.id,
        total_amount: totalAmount,
        status: 'pending_shipment',
        channel: 'retail',
        shipping_fee: shippingResult.shipping_fee,
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
    for (const item of items) {
      const product = productMap.get(item.product_id)!
      await db
        .from('products')
        .update({ stock: product.stock - item.quantity })
        .eq('id', item.product_id)
    }

    // 9. 增加销量
    const productSalesMap = new Map<number, number>()
    for (const item of items) {
      const current = productSalesMap.get(item.product_id) || 0
      productSalesMap.set(item.product_id, current + item.quantity)
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

    // 10. 清除已下单的购物车商品
    if (cart_ids && cart_ids.length > 0) {
      await db
        .from('retail_cart')
        .delete()
        .in('id', cart_ids)
        .eq('user_id', user.id)
    }

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
    .select('id, order_no, total_amount, status, channel, shipping_fee, created_at', { count: 'exact' })
    .eq('user_id', user.id)
    .eq('channel', 'retail')
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

  // 统计商品数量和收集图片
  const itemCountMap = new Map<number, number>()
  const imageMap = new Map<number, (string | null)[]>()

  if (allItems) {
    for (const item of allItems) {
      itemCountMap.set(item.order_id, (itemCountMap.get(item.order_id) || 0) + 1)

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
    channel: o.channel,
    shipping_fee: Number(o.shipping_fee),
    created_at: o.created_at,
  }))

  return paginate(c, list, count || 0, page, pageSize)
})

// GET /count - 订单状态计数
app.get('/count', async (c) => {
  const user = c.get('user')
  const db = createAdminClient(c.env)

  const statuses = ['pending_shipment', 'pending_receipt']
  const result: Record<string, number> = {
    pending_shipment: 0,
    pending_receipt: 0,
  }

  // 并行查询各状态数量
  const promises = statuses.map(async (status) => {
    const { count } = await db
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('channel', 'retail')
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
    .eq('channel', 'retail')
    .maybeSingle()

  if (!order) {
    return error(c, 404, '订单不存在', 404)
  }

  const { data: items } = await db
    .from('order_items')
    .select('*')
    .eq('order_id', id)
    .order('id', { ascending: true })

  return success(c, {
    ...order,
    total_amount: Number(order.total_amount),
    shipping_fee: Number(order.shipping_fee),
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
    .eq('channel', 'retail')
    .maybeSingle()

  if (!order) {
    return error(c, 404, '订单不存在', 404)
  }

  if (order.status !== 'pending_shipment') {
    return error(c, 400, '只有待发货订单可以取消', 400)
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
    .eq('channel', 'retail')
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

  // 首次确认收货赠送积分
  await awardFirstPurchasePoints(db, user.id)

  return success(c, null, '已确认收货')
})

export default app
