import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Form, Input, Modal, Select, Space, Table, Tabs, Tag, message } from 'antd'
import { SearchOutlined, ReloadOutlined, CheckOutlined, UploadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useNavigate } from 'react-router-dom'
import request from '@/utils/request'
import type { PaginatedResponse } from 'shared/types/api'
import type { OrderStatus } from 'shared/constants/order-status'
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from 'shared/constants/order-status'
import { formatPrice, formatDateTime } from 'shared/utils/format'

interface OrderListRow {
  id: number
  order_no: string
  user_phone: string
  total_amount: number
  shipping_fee: number
  status: OrderStatus
  status_text: string
  item_count: number
  product_images: (string | null)[]
  created_at: string
}

const channelTabItems = [
  { key: '', label: '全部' },
  { key: 'wholesale', label: '批发' },
  { key: 'retail', label: '零售' },
]

const statusOptions: { label: string; value: OrderStatus | '' }[] = [
  { label: '全部', value: '' },
  { label: ORDER_STATUS_LABEL.pending_payment, value: 'pending_payment' },
  { label: ORDER_STATUS_LABEL.pending_shipment, value: 'pending_shipment' },
  { label: ORDER_STATUS_LABEL.pending_receipt, value: 'pending_receipt' },
  { label: ORDER_STATUS_LABEL.completed, value: 'completed' },
  { label: ORDER_STATUS_LABEL.cancelled, value: 'cancelled' },
]

export default function OrderList() {
  const navigate = useNavigate()
  const [form] = Form.useForm()

  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<OrderListRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [channel, setChannel] = useState('')

  const fetchOrders = useCallback(() => {
    setLoading(true)
    const values = form.getFieldsValue()
    request
      .get<PaginatedResponse<OrderListRow>>('/admin/orders', {
        params: {
          page,
          page_size: pageSize,
          order_no: values.order_no || undefined,
          user_phone: values.user_phone || undefined,
          status: values.status || undefined,
          channel: channel || undefined,
        },
      })
      .then((res) => {
        setDataSource(res.data.data.list)
        setTotal(res.data.data.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [form, page, pageSize, channel])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const handleSearch = () => {
    setPage(1)
    fetchOrders()
  }

  const handleReset = () => {
    form.resetFields()
    setPage(1)
  }

  const handleChannelChange = (key: string) => {
    setChannel(key)
    setPage(1)
  }

  const handleMarkPaid = (record: OrderListRow) => {
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
              <span style={{ fontWeight: 500 }}>{record.order_no}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#595959' }}>订单金额</span>
              <span style={{ fontWeight: 600, color: '#f5222d' }}>{formatPrice(record.total_amount)}</span>
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
          await request.patch(`/admin/orders/${record.id}/status`, { status: 'pending_shipment' })
          message.success('已标记为已付款')
          fetchOrders()
        } catch {
          message.error('操作失败，请重试')
        }
      },
    })
  }

  const handleShip = (record: OrderListRow) => {
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
              <span style={{ fontWeight: 500 }}>{record.order_no}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#595959' }}>订单金额</span>
              <span style={{ fontWeight: 600, color: '#f5222d' }}>{formatPrice(record.total_amount)}</span>
            </div>
          </div>
        </div>
      ),
      okText: '确认发货',
      cancelText: '取消',
      okButtonProps: { type: 'primary' },
      width: 480,
      onOk: async () => {
        try {
          await request.post(`/admin/orders/${record.id}/ship`, { shipping_no: '' })
          message.success('发货成功')
          fetchOrders()
        } catch {
          message.error('操作失败，请重试')
        }
      },
    })
  }

  const handleBatchShip = () => {
    const { confirm } = Modal
    let orderNoStr = ''
    const content = (
      <div style={{ marginTop: 12 }}>
        <div style={{
          background: '#e6f7ff',
          border: '1px solid #91d5ff',
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>📦</span>
            <span style={{ fontWeight: 500, color: '#096dd9' }}>批量发货</span>
          </div>
          <div style={{ marginTop: 8, color: '#0050b3', lineHeight: 1.6 }}>
            请输入需要发货的订单号，每行一个，支持多个订单号同时发货。
          </div>
        </div>
        <Input.TextArea
          rows={6}
          placeholder={`请输入订单号，每行一个，例如：\n20260604050440444622\n20260604050440444623`}
          value={orderNoStr}
          onChange={(e) => { orderNoStr = e.target.value }}
          style={{ fontFamily: 'monospace' }}
        />
      </div>
    )

    confirm({
      title: '批量发货',
      icon: null,
      content,
      okText: '确认发货',
      cancelText: '取消',
      width: 520,
      onOk: async () => {
        const orderNos = orderNoStr
          .split('\n')
          .map((s) => s.trim())
          .filter((s) => s.length > 0)

        if (orderNos.length === 0) {
          message.warning('请输入至少一个订单号')
          return Promise.reject()
        }

        const hide = message.loading(`正在发货 ${orderNos.length} 个订单...`)
        try {
          // First fetch orders by order_no to get their ids and status
          const { data: orders } = await request.get('/admin/orders', {
            params: { status: 'pending_shipment', page_size: 100 },
          })

          const validOrders = (orders.data.data.list as OrderListRow[]).filter(
            (o) => orderNos.includes(o.order_no)
          )
          const notFound = orderNos.filter((no) => !validOrders.some((o) => o.order_no === no))

          if (notFound.length > 0) {
            message.warning(`以下订单号不存在或不是待发货状态：${notFound.join(', ')}`)
          }

          // Ship valid orders
          let successCount = 0
          let failCount = 0
          const failMsgs: string[] = []

          for (const order of validOrders) {
            try {
              await request.post(`/admin/orders/${order.id}/ship`, { shipping_no: '' })
              successCount++
            } catch {
              failCount++
              failMsgs.push(order.order_no)
            }
          }

          hide()
          if (failCount === 0) {
            message.success(`成功发货 ${successCount} 个订单`)
          } else {
            message.warning(`成功 ${successCount} 个，失败 ${failCount} 个：${failMsgs.join(', ')}`)
          }
          fetchOrders()
        } catch {
          hide()
          message.error('批量发货失败，请重试')
        }
      },
    })
  }

  const columns: ColumnsType<OrderListRow> = [
    {
      title: '订单号',
      dataIndex: 'order_no',
      key: 'order_no',
      width: 200,
    },
    {
      title: '用户手机号',
      dataIndex: 'user_phone',
      key: 'user_phone',
      width: 130,
    },
    {
      title: '商品数量',
      dataIndex: 'item_count',
      key: 'item_count',
      width: 100,
      align: 'center',
    },
    {
      title: '订单金额',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 120,
      align: 'right',
      render: (val: number) => formatPrice(val),
    },
    {
      title: '运费',
      dataIndex: 'shipping_fee',
      key: 'shipping_fee',
      width: 90,
      align: 'right',
      render: (val: number) => (val ? `¥${val.toFixed(2)}` : '免运费'),
    },
    {
      title: '订单状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      align: 'center',
      render: (status: OrderStatus) => (
        <Tag color={ORDER_STATUS_COLOR[status]}>{ORDER_STATUS_LABEL[status]}</Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (val: string) => formatDateTime(val),
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      render: (_: unknown, record: OrderListRow) => (
        <Space size={0}>
          <Button type="link" size="small" onClick={() => navigate(`/admin/orders/${record.id}`)}>
            查看详情
          </Button>
          {record.status === 'pending_payment' && (
            <Button type="primary" size="small" onClick={() => handleMarkPaid(record)}>
              标记已付款
            </Button>
          )}
          {record.status === 'pending_shipment' && (
            <Button type="primary" size="small" onClick={() => handleShip(record)}>
              发货
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Tabs
        activeKey={channel}
        onChange={handleChannelChange}
        items={channelTabItems}
        style={{ marginBottom: 16 }}
      />
      <Card style={{ marginBottom: 16 }}>
        <Form form={form} layout="inline">
          <Form.Item name="order_no" label="订单号">
            <Input placeholder="请输入订单号" allowClear style={{ width: 180 }} />
          </Form.Item>
          <Form.Item name="user_phone" label="用户手机号">
            <Input placeholder="请输入手机号" allowClear maxLength={11} style={{ width: 160 }} />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select placeholder="请选择状态" allowClear style={{ width: 130 }} options={statusOptions} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                搜索
              </Button>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card title="订单列表" extra={
        <Button icon={<UploadOutlined />} onClick={handleBatchShip}>
          批量发货
        </Button>
      }>
        <Table<OrderListRow>
          rowKey="id"
          columns={columns}
          dataSource={dataSource}
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (p, ps) => {
              setPage(p)
              setPageSize(ps)
            },
          }}
        />
      </Card>
    </div>
  )
}
