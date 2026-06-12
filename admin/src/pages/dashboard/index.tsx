import { useCallback, useEffect, useState } from 'react'
import { Row, Col, Card, Select, Statistic, Table, Tag, Spin } from 'antd'
import {
  ShoppingCartOutlined,
  DollarOutlined,
  UserOutlined,
  ShoppingOutlined,
  CustomerServiceOutlined,
  MessageOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import request from '@/utils/request'
import type { ApiResponse } from 'shared/types/api'
import type { OrderStatus } from 'shared/constants/order-status'
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from 'shared/constants/order-status'

interface DashboardData {
  today_orders: number
  today_sales: number
  total_users: number
  total_products: number
  recent_orders: RecentOrder[]
  pending_after_sales?: number
  unread_messages?: number
}

const channelOptions = [
  { value: '', label: '全部渠道' },
  { value: 'wholesale', label: '批发' },
  { value: 'retail', label: '零售' },
]

interface RecentOrder {
  id: number
  order_no: string
  total_amount: number
  status: OrderStatus
  status_text: string
  item_count: number
  created_at: string
}

const defaultDashboard: DashboardData = {
  today_orders: 0,
  today_sales: 0,
  total_users: 0,
  total_products: 0,
  recent_orders: [],
}

const columns: ColumnsType<RecentOrder> = [
  {
    title: '订单号',
    dataIndex: 'order_no',
    key: 'order_no',
  },
  {
    title: '商品数量',
    dataIndex: 'item_count',
    key: 'item_count',
    align: 'center',
  },
  {
    title: '订单金额',
    dataIndex: 'total_amount',
    key: 'total_amount',
    align: 'right',
    render: (val: number) => `¥${val.toFixed(2)}`,
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    align: 'center',
    render: (status: OrderStatus, record: RecentOrder) => (
      <Tag color={ORDER_STATUS_COLOR[status]}>
        {record.status_text || ORDER_STATUS_LABEL[status]}
      </Tag>
    ),
  },
  {
    title: '下单时间',
    dataIndex: 'created_at',
    key: 'created_at',
  },
]

export default function Dashboard() {
  const [data, setData] = useState<DashboardData>(defaultDashboard)
  const [loading, setLoading] = useState(true)
  const [channel, setChannel] = useState('')

  const fetchDashboard = useCallback(() => {
    setLoading(true)
    request
      .get<ApiResponse<DashboardData>>('/admin/dashboard', {
        params: { channel: channel || undefined },
      })
      .then((res) => {
        setData(res.data.data)
      })
      .catch(() => {
        // error already handled by request interceptor
      })
      .finally(() => {
        setLoading(false)
      })
  }, [channel])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Select
          value={channel}
          onChange={setChannel}
          options={channelOptions}
          style={{ width: 160 }}
        />
      </div>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="今日订单数"
              value={data.today_orders}
              prefix={<ShoppingCartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="今日销售额"
              value={data.today_sales}
              precision={2}
              prefix={<DollarOutlined />}
              suffix="元"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总用户数"
              value={data.total_users}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总商品数"
              value={data.total_products}
              prefix={<ShoppingOutlined />}
            />
          </Card>
        </Col>
        {channel === 'retail' && (
          <>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="待处理售后"
                  value={data.pending_after_sales ?? 0}
                  prefix={<CustomerServiceOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="未读消息"
                  value={data.unread_messages ?? 0}
                  prefix={<MessageOutlined />}
                />
              </Card>
            </Col>
          </>
        )}
      </Row>

      <Card title="最近订单" style={{ marginTop: 16 }}>
        <Table<RecentOrder>
          columns={columns}
          dataSource={data.recent_orders}
          rowKey="id"
          pagination={false}
        />
      </Card>
    </div>
  )
}
