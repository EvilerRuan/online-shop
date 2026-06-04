import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Switch,
  Table,
  message,
  Typography,
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  CopyOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import request from '@/utils/request'
import type { ApiResponse, PaginatedResponse } from 'shared/types/api'
import { formatDateTime } from 'shared/utils/format'

interface UserRow {
  id: string
  user_no: number
  username: string
  phone: string
  role: 'user' | 'admin'
  status: 'active' | 'disabled'
  last_password: string
  created_at: string
  updated_at: string
}

// Generate 6-digit numeric password
function generateNumericPassword(): string {
  let pwd = ''
  for (let i = 0; i < 6; i++) {
    pwd += Math.floor(Math.random() * 10).toString()
  }
  return pwd
}

// Validate 6-digit numeric password
const numericPasswordRules = [
  { required: true, message: '请输入密码' },
  {
    pattern: /^\d{6}$/,
    message: '密码必须是6位数字',
  },
]

export default function UserManage() {
  const [searchForm] = Form.useForm()
  const [addForm] = Form.useForm()
  const [resetPwdForm] = Form.useForm()

  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<UserRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [resetPwdModalOpen, setResetPwdModalOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<UserRow | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Track which passwords are visible
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({})

  const fetchUsers = useCallback(() => {
    setLoading(true)
    const values = searchForm.getFieldsValue()
    request
      .get<PaginatedResponse<UserRow>>('/admin/users', {
        params: {
          page,
          page_size: pageSize,
          keyword: values.keyword || undefined,
          phone: values.phone || undefined,
        },
      })
      .then((res) => {
        setDataSource(res.data.data.list)
        setTotal(res.data.data.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [searchForm, page, pageSize])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleSearch = () => {
    setPage(1)
    fetchUsers()
  }

  const handleReset = () => {
    searchForm.resetFields()
    setPage(1)
  }

  const handleToggleStatus = (record: UserRow, checked: boolean) => {
    const newStatus = checked ? 'active' : 'disabled'
    request
      .patch<ApiResponse>(`/admin/users/${record.id}/status`, { status: newStatus })
      .then(() => {
        message.success(checked ? '已启用' : '已禁用')
        fetchUsers()
      })
      .catch(() => {})
  }

  const handleAddUser = async () => {
    try {
      const values = await addForm.validateFields()
      setSubmitting(true)
      await request.post<ApiResponse>('/admin/users', {
        username: values.username,
        phone: values.phone,
        password: values.password,
      })
      message.success('添加用户成功')
      setAddModalOpen(false)
      addForm.resetFields()
      fetchUsers()
    } catch {
      // validation or request error
    } finally {
      setSubmitting(false)
    }
  }

  const handleResetPassword = async () => {
    try {
      const values = await resetPwdForm.validateFields()
      setSubmitting(true)
      await request.post<ApiResponse>(`/admin/users/${currentUser!.id}/reset-password`, {
        password: values.password,
      })
      message.success('密码重置成功')
      setResetPwdModalOpen(false)
      resetPwdForm.resetFields()
      fetchUsers()
    } catch {
      // validation or request error
    } finally {
      setSubmitting(false)
    }
  }

  const handleGenerateRandomPassword = (formInstance: typeof addForm) => {
    const pwd = generateNumericPassword()
    formInstance.setFieldsValue({ password: pwd })
  }

  const togglePasswordVisible = (userId: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [userId]: !prev[userId] }))
  }

  const copyPassword = (password: string) => {
    if (password) {
      navigator.clipboard.writeText(password).then(() => message.success('密码已复制'))
    } else {
      message.info('暂无密码记录')
    }
  }

  const columns: ColumnsType<UserRow> = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 120,
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      width: 130,
    },
    {
      title: '密码',
      key: 'password',
      width: 220,
      render: (_: unknown, record: UserRow) => {
        const pwd = record.last_password
        if (!pwd) {
          return <Typography.Text type="secondary">暂无记录</Typography.Text>
        }
        const visible = visiblePasswords[record.id]
        return (
          <Space size={4}>
            <Typography.Text
              style={{ fontFamily: 'monospace', minWidth: 60, display: 'inline-block' }}
            >
              {visible ? pwd : '••••••'}
            </Typography.Text>
            <Button
              type="text"
              size="small"
              icon={visible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              onClick={() => togglePasswordVisible(record.id)}
            />
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => copyPassword(pwd)}
            />
          </Space>
        )
      },
    },
    {
      title: '注册时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (val: string) => formatDateTime(val),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      align: 'center',
      render: (status: string, record: UserRow) => (
        <Switch
          checked={status === 'active'}
          onChange={(checked) => handleToggleStatus(record, checked)}
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, record: UserRow) => (
        <Button
          type="link"
          size="small"
          onClick={() => {
            setCurrentUser(record)
            resetPwdForm.resetFields()
            setResetPwdModalOpen(true)
          }}
        >
          重置密码
        </Button>
      ),
    },
  ]

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Form form={searchForm} layout="inline">
          <Form.Item name="keyword" label="用户名">
            <Input placeholder="请输入用户名" allowClear style={{ width: 160 }} />
          </Form.Item>
          <Form.Item name="phone" label="手机号">
            <Input placeholder="请输入手机号" allowClear maxLength={11} style={{ width: 160 }} />
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

      <Card
        title="用户列表"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              addForm.resetFields()
              setAddModalOpen(true)
            }}
          >
            添加用户
          </Button>
        }
      >
        <Table<UserRow>
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
        title="添加用户"
        open={addModalOpen}
        onOk={handleAddUser}
        onCancel={() => {
          setAddModalOpen(false)
          addForm.resetFields()
        }}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={addForm} layout="vertical" preserve={false}>
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item
            name="phone"
            label="手机号"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的11位手机号' },
            ]}
          >
            <Input placeholder="请输入手机号" maxLength={11} />
          </Form.Item>
          <Form.Item label="初始密码（6位数字）" required style={{ marginBottom: 8 }}>
            <Space.Compact style={{ width: '100%' }}>
              <Form.Item name="password" noStyle rules={numericPasswordRules}>
                <Input
                  placeholder="请输入6位数字密码"
                  maxLength={6}
                  style={{ width: '100%' }}
                />
              </Form.Item>
              <Button
                icon={<ThunderboltOutlined />}
                onClick={() => handleGenerateRandomPassword(addForm)}
                title="生成随机密码"
              >
                随机
              </Button>
            </Space.Compact>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`重置密码 - ${currentUser?.username ?? ''}`}
        open={resetPwdModalOpen}
        onOk={handleResetPassword}
        onCancel={() => {
          setResetPwdModalOpen(false)
          resetPwdForm.resetFields()
        }}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={resetPwdForm} layout="vertical" preserve={false}>
          <Form.Item label="新密码（6位数字）" required style={{ marginBottom: 8 }}>
            <Space.Compact style={{ width: '100%' }}>
              <Form.Item name="password" noStyle rules={numericPasswordRules}>
                <Input
                  placeholder="请输入6位数字密码"
                  maxLength={6}
                  style={{ width: '100%' }}
                />
              </Form.Item>
              <Button
                icon={<ThunderboltOutlined />}
                onClick={() => handleGenerateRandomPassword(resetPwdForm)}
                title="生成随机密码"
              >
                随机
              </Button>
            </Space.Compact>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
