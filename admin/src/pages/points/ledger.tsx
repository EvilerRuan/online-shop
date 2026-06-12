import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Form, Input, Select, Space, Table, Tag } from 'antd'
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import request from '@/utils/request'
import type { ApiResponse } from 'shared/types/api'
import { formatDateTime } from 'shared/utils/format'

interface LedgerRecord {
  id: number
  user_name: string
  type: 'earn' | 'spend'
  points: number
  reason: string
  balance_after: number
  created_at: string
}

export default function PointsLedger() {
  const [searchForm] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<LedgerRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const fetchList = useCallback(() => {
    setLoading(true)
    const values = searchForm.getFieldsValue()
    request
      .get<ApiResponse<{ list: LedgerRecord[]; total: number }>>('/admin/points/ledger', {
        params: {
          page,
          page_size: pageSize,
          keyword: values.keyword || undefined,
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

  const columns: ColumnsType<LedgerRecord> = [
    { title: '用户', dataIndex: 'user_name', key: 'user_name' },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (val: string, record: LedgerRecord) =>
        val === 'earn' ? (
          <Tag color="green">+{record.points}</Tag>
        ) : (
          <Tag color="red">-{record.points}</Tag>
        ),
    },
    {
      title: '积分',
      dataIndex: 'points',
      key: 'points',
      width: 80,
      align: 'center',
    },
    { title: '原因', dataIndex: 'reason', key: 'reason', ellipsis: true },
    {
      title: '变动后余额',
      dataIndex: 'balance_after',
      key: 'balance_after',
      width: 100,
      align: 'center',
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (val: string) => formatDateTime(val),
    },
  ]

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Form form={searchForm} layout="inline">
          <Form.Item name="keyword" label="用户">
            <Input placeholder="搜索用户名" allowClear style={{ width: 160 }} />
          </Form.Item>
          <Form.Item name="type" label="类型">
            <Select
              allowClear
              placeholder="全部"
              style={{ width: 120 }}
              options={[
                { label: '获得', value: 'earn' },
                { label: '消费', value: 'spend' },
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

      <Card title="积分流水记录">
        <Table<LedgerRecord>
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
