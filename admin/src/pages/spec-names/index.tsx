import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Space,
  Tag,
  message,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  TagsOutlined,
} from '@ant-design/icons'
import request from '@/utils/request'
import type { ApiResponse } from 'shared/types/api'

interface SpecName {
  id: number
  name: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function SpecNames() {
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<SpecName[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<SpecName | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  const fetchList = useCallback(() => {
    setLoading(true)
    request
      .get<ApiResponse<SpecName[]>>('/admin/spec-names')
      .then((res) => setDataSource(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const openAddModal = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ sort_order: 0 })
    setModalOpen(true)
  }

  const openEditModal = (record: SpecName) => {
    setEditing(record)
    form.setFieldsValue({
      name: record.name,
      sort_order: record.sort_order,
    })
    setModalOpen(true)
  }

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)

      if (editing) {
        await request.put<ApiResponse>(`/admin/spec-names/${editing.id}`, {
          name: values.name,
          sort_order: values.sort_order ?? 0,
        })
        message.success('编辑成功')
      } else {
        await request.post<ApiResponse>('/admin/spec-names', {
          name: values.name,
          sort_order: values.sort_order ?? 0,
        })
        message.success('添加成功')
      }

      setModalOpen(false)
      fetchList()
    } catch {
      // validation or request error
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = (id: number) => {
    request
      .delete<ApiResponse>(`/admin/spec-names/${id}`)
      .then(() => {
        message.success('删除成功')
        fetchList()
      })
      .catch(() => {})
  }

  return (
    <div>
      <Card
        title={
          <Space>
            <TagsOutlined />
            <span>规格名称管理</span>
            <Tag color="blue">{dataSource.length}</Tag>
          </Space>
        }
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
            添加规格名称
          </Button>
        }
        loading={loading}
      >
        <Row gutter={[12, 12]}>
          {dataSource.map((item) => (
            <Col key={item.id} xs={12} sm={8} md={6} lg={4}>
              <Card
                size="small"
                style={{ borderRadius: 8, textAlign: 'center' }}
                styles={{ body: { padding: '16px 12px' } }}
              >
                <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
                  {item.name}
                </div>
                <div style={{ fontSize: 12, color: '#999', marginBottom: 12 }}>
                  权重: {item.sort_order}
                </div>
                <Space size={4}>
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => openEditModal(item)}
                  />
                  <Popconfirm
                    title="确定删除该规格名称吗？"
                    onConfirm={() => handleDelete(item.id)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      <Modal
        title={editing ? '编辑规格名称' : '添加规格名称'}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        destroyOnClose
        width={400}
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            name="name"
            label="规格名称"
            rules={[{ required: true, message: '请输入规格名称' }]}
            initialValue={editing?.name}
          >
            <Input placeholder="如：个、箱、件" maxLength={10} />
          </Form.Item>
          <Form.Item
            name="sort_order"
            label="排序权重"
            tooltip="数值越小排序越靠前"
            initialValue={editing?.sort_order ?? 0}
          >
            <InputNumber min={0} precision={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
