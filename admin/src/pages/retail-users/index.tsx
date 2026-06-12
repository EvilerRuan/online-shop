import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Card,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  message,
  Typography,
} from 'antd'
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import request from '@/utils/request'
import type { ApiResponse } from 'shared/types/api'
import { formatDateTime } from 'shared/utils/format'

interface RetailUser {
  id: string
  username: string
  phone: string
  avatar_url: string | null
  points_balance: number
  referrer_name: string | null
  created_at: string
}

export default function RetailUsers() {
  const [searchForm] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<RetailUser[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [adjustModalOpen, setAdjustModalOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<RetailUser | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [adjustForm] = Form.useForm()

  const fetchList = useCallback(() => {
    setLoading(true)
    const values = searchForm.getFieldsValue()
    request
      .get<ApiResponse<{ list: RetailUser[]; total: number }>>('/admin/retail-users', {
        params: {
          page,
          page_size: pageSize,
          keyword: values.keyword || undefined,
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

  const openAdjustModal = (user: RetailUser) => {
    setCurrentUser(user)
    adjustForm.resetFields()
    setAdjustModalOpen(true)
  }

  const handleAdjustPoints = async () => {
    try {
      const values = await adjustForm.validateFields()
      setSubmitting(true)
      await request.post<ApiResponse>(`/admin/retail-users/${currentUser!.id}/adjust-points`, {
        type: values.type,
        points: values.points,
        reason: values.reason,
      })
      message.success('积分调整成功')
      setAdjustModalOpen(false)
      fetchList()
    } catch {
      // validation or request error
    } finally {
      setSubmitting(false)
    }
  }

  const columns: ColumnsType<RetailUser> = [
    { title: '用户名', dataIndex: 'username', key: 'username' },
    { title: '手机号', dataIndex: 'phone', key: 'phone', width: 130 },
    {
      title: '头像',
      dataIndex: 'avatar_url',
      key: 'avatar_url',
      width: 60,
      render: (url: string | null) =>
        url ? (
          <Image src={url} width={36} height={36} style={{ borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          '-'
        ),
    },
    {
      title: '积分余额',
      dataIndex: 'points_balance',
      key: 'points_balance',
      width: 100,
      align: 'center',
    },
    {
      title: '推荐人',
      dataIndex: 'referrer_name',
      key: 'referrer_name',
      render: (val: string | null) => val || '-',
    },
    {
      title: '注册时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (val: string) => formatDateTime(val),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, record: RetailUser) => (
        <Button type="link" size="small" onClick={() => openAdjustModal(record)}>
          积分调整
        </Button>
      ),
    },
  ]

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Space style={{ marginBottom: 12 }}>
          <Tag color="green">零售端</Tag>
          <Typography.Text type="secondary">
            零售用户通过 H5 自行注册（手机验证码登录），后台仅可查看和管理积分
          </Typography.Text>
        </Space>
        <Form form={searchForm} layout="inline">
          <Form.Item name="keyword" label="搜索">
            <Input placeholder="手机号/用户名" allowClear style={{ width: 200 }} />
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

      <Card title="零售用户列表">
        <Table<RetailUser>
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
        title={`积分调整 - ${currentUser?.username ?? ''}`}
        open={adjustModalOpen}
        onOk={handleAdjustPoints}
        onCancel={() => {
          setAdjustModalOpen(false)
          adjustForm.resetFields()
        }}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={adjustForm} layout="vertical" preserve={false}>
          <Form.Item
            name="type"
            label="调整类型"
            rules={[{ required: true, message: '请选择调整类型' }]}
          >
            <Select
              placeholder="请选择"
              options={[
                { label: '增加', value: 'add' },
                { label: '扣减', value: 'deduct' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="points"
            label="积分数量"
            rules={[{ required: true, message: '请输入积分数量' }]}
          >
            <InputNumber min={1} precision={0} style={{ width: '100%' }} placeholder="请输入积分数量" />
          </Form.Item>
          <Form.Item
            name="reason"
            label="调整原因"
            rules={[{ required: true, message: '请输入调整原因' }]}
          >
            <Input placeholder="请输入调整原因" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
