import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Space,
  Table,
  Tag,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import request from '@/utils/request'
import type { ApiResponse } from 'shared/types/api'
import { formatDateTime } from 'shared/utils/format'

interface RedeemOrder {
  id: number
  order_no: string
  user_name: string
  product_name: string
  points_cost: number
  status: 'pending' | 'shipped' | 'completed'
  shipping_no: string | null
  created_at: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: '待处理', color: 'orange' },
  shipped: { label: '已发货', color: 'blue' },
  completed: { label: '已完成', color: 'green' },
}

export default function PointsRedeems() {
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<RedeemOrder[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [shipModalOpen, setShipModalOpen] = useState(false)
  const [currentOrder, setCurrentOrder] = useState<RedeemOrder | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  const fetchList = useCallback(() => {
    setLoading(true)
    request
      .get<ApiResponse<{ list: RedeemOrder[]; total: number }>>('/admin/points/redeems', {
        params: { page, page_size: pageSize },
      })
      .then((res) => {
        const data = res.data.data
        setDataSource(Array.isArray(data) ? data : data.list ?? [])
        setTotal(data.total ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, pageSize])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const openShipModal = (record: RedeemOrder) => {
    setCurrentOrder(record)
    form.resetFields()
    setShipModalOpen(true)
  }

  const handleShip = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)
      await request.put<ApiResponse>(`/admin/points/redeems/${currentOrder!.id}/ship`, {
        shipping_no: values.shipping_no,
      })
      message.success('发货成功')
      setShipModalOpen(false)
      fetchList()
    } catch {
      // validation or request error
    } finally {
      setSubmitting(false)
    }
  }

  const columns: ColumnsType<RedeemOrder> = [
    { title: '订单号', dataIndex: 'order_no', key: 'order_no' },
    { title: '用户', dataIndex: 'user_name', key: 'user_name' },
    { title: '兑换商品', dataIndex: 'product_name', key: 'product_name' },
    {
      title: '消耗积分',
      dataIndex: 'points_cost',
      key: 'points_cost',
      width: 100,
      align: 'center',
      render: (val: number) => `${val} 积分`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (val: string) => {
        const config = STATUS_CONFIG[val]
        return config ? <Tag color={config.color}>{config.label}</Tag> : val
      },
    },
    {
      title: '物流单号',
      dataIndex: 'shipping_no',
      key: 'shipping_no',
      render: (val: string | null) => val || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (val: string) => formatDateTime(val),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, record: RedeemOrder) => (
        <Space size="small">
          {record.status === 'pending' && (
            <Button type="link" size="small" onClick={() => openShipModal(record)}>
              发货
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Card title="积分兑换订单">
        <Table<RedeemOrder>
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

      <Modal
        title="发货"
        open={shipModalOpen}
        onOk={handleShip}
        onCancel={() => {
          setShipModalOpen(false)
          form.resetFields()
        }}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            name="shipping_no"
            label="物流单号"
            rules={[{ required: true, message: '请输入物流单号' }]}
          >
            <Input placeholder="请输入物流单号" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
