import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Card,
  Descriptions,
  Image,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tag,
  message,
} from 'antd'
import { useNavigate, useParams } from 'react-router-dom'
import type { ColumnsType } from 'antd/es/table'
import request from '@/utils/request'
import type { ApiResponse } from 'shared/types/api'
import type { OrderStatus } from 'shared/constants/order-status'
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from 'shared/constants/order-status'
import { formatPrice, formatDateTime } from 'shared/utils/format'

interface OrderDetailData {
  id: number
  order_no: string
  user_id: string
  user_phone: string
  total_amount: number
  status: OrderStatus
  status_text: string
  remark: string
  recipient_name: string
  recipient_phone: string
  address: string
  shipping_no: string | null
  created_at: string
  updated_at: string
  items: OrderItemRow[]
}

interface OrderItemRow {
  id: number
  order_id: number
  product_id: number
  sku_id: number
  product_name: string
  sku_name: string
  main_image: string | null
  price: number
  quantity: number
  subtotal: number
  unit_quantity: number
  remark: string
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [order, setOrder] = useState<OrderDetailData | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fetchOrder = useCallback(() => {
    if (!id) return
    setLoading(true)
    request
      .get<ApiResponse<OrderDetailData>>(`/admin/orders/${id}`)
      .then((res) => setOrder(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    fetchOrder()
  }, [fetchOrder])

  const handleShip = () => {
    if (!order) return
    Modal.confirm({
      title: '确认发货',
      icon: null,
      content: (
        <div style={{ marginTop: 16 }}>
          <div style={{
            background: '#e6f7ff',
            border: '1px solid #91d5ff',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>📦</span>
              <span style={{ fontWeight: 500, color: '#096dd9' }}>发货确认</span>
            </div>
            <div style={{ marginTop: 8, color: '#0050b3', lineHeight: 1.6 }}>
              确认以下订单已打包完毕，将发货给客户？
            </div>
          </div>
          <div style={{
            background: '#f0f5ff',
            border: '1px solid #adc6ff',
            borderRadius: 8,
            padding: '12px 16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: '#595959' }}>订单号</span>
              <span style={{ fontWeight: 500 }}>{order.order_no}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: '#595959' }}>订单金额</span>
              <span style={{ fontWeight: 600, color: '#f5222d' }}>{formatPrice(order.total_amount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#595959' }}>收件人</span>
              <span>{order.recipient_name} {order.recipient_phone}</span>
            </div>
          </div>
        </div>
      ),
      okText: '确认发货',
      cancelText: '取消',
      okButtonProps: { type: 'primary' },
      width: 480,
      onOk: async () => {
        setSubmitting(true)
        try {
          await request.post<ApiResponse>(`/admin/orders/${id}/ship`, { shipping_no: '' })
          message.success('发货成功')
          fetchOrder()
        } catch {
          message.error('操作失败，请重试')
        } finally {
          setSubmitting(false)
        }
      },
    })
  }

  const handleConfirmReceipt = () => {
    request
      .patch<ApiResponse>(`/admin/orders/${id}/status`, { status: 'completed' })
      .then(() => {
        message.success('已确认收货')
        fetchOrder()
      })
      .catch(() => {})
  }

  const handleMarkPaid = () => {
    if (!order) return
    Modal.confirm({
      title: '确认标记为已付款',
      icon: null,
      content: (
        <div style={{ marginTop: 16 }}>
          <div style={{
            background: '#fffbe6',
            border: '1px solid #ffe58f',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>⚠️</span>
              <span style={{ fontWeight: 500, color: '#d46b08' }}>重要提示</span>
            </div>
            <div style={{ marginTop: 8, color: '#ad6800', lineHeight: 1.6 }}>
              此操作将把订单状态从「待付款」变更为「待发货」，请确保已收到客户款项后再执行此操作。
            </div>
          </div>
          <div style={{
            background: '#f0f5ff',
            border: '1px solid #adc6ff',
            borderRadius: 8,
            padding: '12px 16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: '#595959' }}>订单号</span>
              <span style={{ fontWeight: 500 }}>{order.order_no}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: '#595959' }}>订单金额</span>
              <span style={{ fontWeight: 600, color: '#f5222d' }}>{formatPrice(order.total_amount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#595959' }}>用户手机号</span>
              <span>{order.user_phone}</span>
            </div>
          </div>
        </div>
      ),
      okText: '确认已收款',
      cancelText: '取消',
      okButtonProps: { danger: true },
      width: 480,
      onOk: async () => {
        try {
          await request.patch<ApiResponse>(`/admin/orders/${id}/status`, { status: 'pending_shipment' })
          message.success('已标记为已付款')
          fetchOrder()
        } catch {
          message.error('操作失败，请重试')
        }
      },
    })
  }

  const handleCancel = () => {
    request
      .post<ApiResponse>(`/admin/orders/${id}/cancel`)
      .then(() => {
        message.success('订单已取消')
        fetchOrder()
      })
      .catch(() => {})
  }

  const itemColumns: ColumnsType<OrderItemRow> = [
    {
      title: '商品图片',
      dataIndex: 'main_image',
      key: 'main_image',
      width: 80,
      render: (url: string | null) =>
        url ? (
          <Image src={url} width={50} height={50} style={{ objectFit: 'cover', borderRadius: 4 }} />
        ) : (
          <div
            style={{
              width: 50,
              height: 50,
              background: '#f5f5f5',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#bfbfbf',
              fontSize: 12,
            }}
          >
            无图
          </div>
        ),
    },
    {
      title: '商品名称',
      dataIndex: 'product_name',
      key: 'product_name',
      ellipsis: true,
    },
    {
      title: '规格',
      dataIndex: 'sku_name',
      key: 'sku_name',
      width: 120,
    },
    {
      title: '单价',
      dataIndex: 'price',
      key: 'price',
      width: 100,
      align: 'right',
      render: (val: number) => formatPrice(val),
    },
    {
      title: '商品数',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
      align: 'center',
      render: (val: number) => `${val}个`,
    },
    {
      title: '规格数',
      key: 'spec_qty',
      width: 80,
      align: 'center',
      render: (_: unknown, record: OrderItemRow) => {
        const specCount = record.quantity / record.unit_quantity
        // Extract unit from sku_name: "箱", "盒", "件", "条", etc.
        const unitMatch = record.sku_name.match(/(箱|件|盒|瓶|包|袋|个|支|条)/)
        const unit = unitMatch ? unitMatch[1] : '件'
        return `${specCount}${unit}`
      },
    },
    {
      title: '小计',
      dataIndex: 'subtotal',
      key: 'subtotal',
      width: 100,
      align: 'right',
      render: (val: number) => formatPrice(val),
    },
  ]

  if (loading && !order) {
    return <Card loading />
  }

  if (!order) {
    return <Card>订单不存在</Card>
  }

  const itemsTotal = order.items.reduce((sum, item) => sum + item.subtotal, 0)
  const canCancel =
    order.status === 'pending_payment' || order.status === 'pending_shipment'

  return (
    <div>
      <Card
        title="订单基本信息"
        style={{ marginBottom: 16 }}
        extra={
          <Button onClick={() => navigate('/admin/orders')}>返回列表</Button>
        }
      >
        <Descriptions column={2}>
          <Descriptions.Item label="订单号">{order.order_no}</Descriptions.Item>
          <Descriptions.Item label="创建时间">{formatDateTime(order.created_at)}</Descriptions.Item>
          <Descriptions.Item label="订单状态">
            <Tag color={ORDER_STATUS_COLOR[order.status]}>
              {ORDER_STATUS_LABEL[order.status]}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="用户手机号">{order.user_phone}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="收货地址" style={{ marginBottom: 16 }}>
        <Descriptions column={2}>
          <Descriptions.Item label="收件人">{order.recipient_name}</Descriptions.Item>
          <Descriptions.Item label="电话">{order.recipient_phone}</Descriptions.Item>
          <Descriptions.Item label="地址" span={2}>{order.address}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="商品列表" style={{ marginBottom: 16 }}>
        <Table<OrderItemRow>
          rowKey="id"
          columns={itemColumns}
          dataSource={order.items}
          pagination={false}
        />
      </Card>

      <Card title="金额汇总" style={{ marginBottom: 16 }}>
        <Descriptions column={1}>
          <Descriptions.Item label="商品总额">{formatPrice(itemsTotal)}</Descriptions.Item>
          <Descriptions.Item label="运费">{formatPrice(0)}</Descriptions.Item>
          <Descriptions.Item label="订单总额">
            <span style={{ fontWeight: 600, fontSize: 16, color: '#f5222d' }}>
              {formatPrice(order.total_amount)}
            </span>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {order.shipping_no && (
        <Card title="物流信息" style={{ marginBottom: 16 }}>
          <Descriptions column={1}>
            <Descriptions.Item label="物流单号">{order.shipping_no}</Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      <Card title="操作">
        <Space>
          {order.status === 'pending_payment' && (
            <Button type="primary" size="large" onClick={handleMarkPaid} style={{ fontWeight: 600 }}>
              标记已付款
            </Button>
          )}
          {order.status === 'pending_shipment' && (
            <Button
              type="primary"
              size="large"
              onClick={handleShip}
              loading={submitting}
            >
              发货
            </Button>
          )}
          {order.status === 'pending_receipt' && (
            <Popconfirm
              title="确定确认收货吗？"
              onConfirm={handleConfirmReceipt}
              okText="确定"
              cancelText="取消"
            >
              <Button type="primary" size="large">确认收货</Button>
            </Popconfirm>
          )}
          {canCancel && (
            <Popconfirm
              title="确定取消该订单吗？"
              onConfirm={handleCancel}
              okText="确定"
              cancelText="取消"
            >
              <Button danger size="large">取消订单</Button>
            </Popconfirm>
          )}
        </Space>
      </Card>
    </div>
  )
}
