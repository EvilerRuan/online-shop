import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Card,
  Form,
  Select,
  Space,
  Table,
  Tag,
} from 'antd'
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { ColumnsType } from 'antd/es/table'
import request from '@/utils/request'
import type { ApiResponse } from 'shared/types/api'
import { formatDateTime } from 'shared/utils/format'

interface AfterSaleRecord {
  id: number
  order_no: string
  type: 'refund' | 'return_refund'
  user_name: string
  reason: string
  status: 'pending' | 'processing' | 'approved' | 'rejected' | 'completed'
  refund_amount: number
  created_at: string
}

const TYPE_LABELS: Record<string, string> = {
  refund: '仅退款',
  return_refund: '退货退款',
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: '待处理', color: 'orange' },
  processing: { label: '处理中', color: 'blue' },
  approved: { label: '已同意', color: 'cyan' },
  rejected: { label: '已拒绝', color: 'red' },
  completed: { label: '已完成', color: 'green' },
}

export default function AfterSales() {
  const navigate = useNavigate()
  const [searchForm] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<AfterSaleRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const fetchList = useCallback(() => {
    setLoading(true)
    const values = searchForm.getFieldsValue()
    request
      .get<ApiResponse<{ list: AfterSaleRecord[]; total: number }>>('/admin/after-sales', {
        params: {
          page,
          page_size: pageSize,
          status: values.status || undefined,
          type: values.type || undefined,
        },
      })
      .then((res) => {
        const data = res.data.data
        setDataSource(Array.isArray(data) ? data : data.list ?? [])
        setTotal(data.total ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [searchForm, page, pageSize])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const handleSearch = () => {
    setPage(1)
    fetchList()
  }

  const handleReset = () => {
    searchForm.resetFields()
    setPage(1)
  }

  const columns: ColumnsType<AfterSaleRecord> = [
    { title: '订单号', dataIndex: 'order_no', key: 'order_no' },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (val: string) => TYPE_LABELS[val] || val,
    },
    { title: '用户', dataIndex: 'user_name', key: 'user_name' },
    { title: '原因', dataIndex: 'reason', key: 'reason', ellipsis: true },
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
      title: '退款金额',
      dataIndex: 'refund_amount',
      key: 'refund_amount',
      width: 100,
      align: 'right',
      render: (val: number) => `¥${val}`,
    },
    {
      title: '申请时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (val: string) => formatDateTime(val),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, record: AfterSaleRecord) => (
        <Button
          type="link"
          size="small"
          onClick={() => navigate(`/admin/after-sales/${record.id}`)}
        >
          查看详情
        </Button>
      ),
    },
  ]

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Form form={searchForm} layout="inline">
          <Form.Item name="status" label="状态">
            <Select
              allowClear
              placeholder="全部"
              style={{ width: 130 }}
              options={[
                { label: '待处理', value: 'pending' },
                { label: '处理中', value: 'processing' },
                { label: '已同意', value: 'approved' },
                { label: '已拒绝', value: 'rejected' },
                { label: '已完成', value: 'completed' },
              ]}
            />
          </Form.Item>
          <Form.Item name="type" label="类型">
            <Select
              allowClear
              placeholder="全部"
              style={{ width: 130 }}
              options={[
                { label: '仅退款', value: 'refund' },
                { label: '退货退款', value: 'return_refund' },
              ]}
            />
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

      <Card title="售后管理">
        <Table<AfterSaleRecord>
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
