import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Card,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Table,
  message,
} from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import request from '@/utils/request'
import type { ApiResponse } from 'shared/types/api'

const { TextArea } = Input

interface PointsProduct {
  id: number
  name: string
  image_url: string
  points_cost: number
  stock: number
  description: string
  status: boolean
}

export default function PointsProducts() {
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<PointsProduct[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PointsProduct | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  const fetchList = useCallback(() => {
    setLoading(true)
    request
      .get<ApiResponse<{ list: PointsProduct[]; total: number }>>('/admin/points/products', {
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

  const openAdd = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ status: true })
    setModalOpen(true)
  }

  const openEdit = (record: PointsProduct) => {
    setEditing(record)
    form.setFieldsValue({
      name: record.name,
      image_url: record.image_url,
      points_cost: record.points_cost,
      stock: record.stock,
      description: record.description,
      status: record.status,
    })
    setModalOpen(true)
  }

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)
      const payload = {
        name: values.name,
        image_url: values.image_url,
        points_cost: values.points_cost,
        stock: values.stock,
        description: values.description || '',
        status: values.status ?? true,
      }
      if (editing) {
        await request.put<ApiResponse>(`/admin/points/products/${editing.id}`, payload)
        message.success('编辑成功')
      } else {
        await request.post<ApiResponse>('/admin/points/products', payload)
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
      .delete<ApiResponse>(`/admin/points/products/${id}`)
      .then(() => {
        message.success('删除成功')
        fetchList()
      })
      .catch(() => {})
  }

  const columns: ColumnsType<PointsProduct> = [
    { title: '商品名称', dataIndex: 'name', key: 'name' },
    {
      title: '图片',
      dataIndex: 'image_url',
      key: 'image_url',
      width: 80,
      render: (url: string) =>
        url ? (
          <Image src={url} width={50} height={50} style={{ objectFit: 'cover', borderRadius: 4 }} />
        ) : (
          '-'
        ),
    },
    {
      title: '兑换积分',
      dataIndex: 'points_cost',
      key: 'points_cost',
      width: 100,
      align: 'center',
      render: (val: number) => `${val} 积分`,
    },
    {
      title: '库存',
      dataIndex: 'stock',
      key: 'stock',
      width: 80,
      align: 'center',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      align: 'center',
      render: (val: boolean) => (val ? '上架' : '下架'),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_: unknown, record: PointsProduct) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定删除该商品吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Card
        title="积分兑换商品"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
            添加商品
          </Button>
        }
      >
        <Table<PointsProduct>
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
        title={editing ? '编辑积分商品' : '添加积分商品'}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => {
          setModalOpen(false)
          form.resetFields()
        }}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            name="name"
            label="商品名称"
            rules={[{ required: true, message: '请输入商品名称' }]}
          >
            <Input placeholder="请输入商品名称" />
          </Form.Item>
          <Form.Item
            name="image_url"
            label="图片地址"
            rules={[{ required: true, message: '请输入图片地址' }]}
          >
            <Input placeholder="请输入图片URL" />
          </Form.Item>
          <Form.Item
            name="points_cost"
            label="兑换所需积分"
            rules={[{ required: true, message: '请输入兑换所需积分' }]}
          >
            <InputNumber min={1} precision={0} style={{ width: '100%' }} placeholder="请输入兑换所需积分" />
          </Form.Item>
          <Form.Item
            name="stock"
            label="库存"
            rules={[{ required: true, message: '请输入库存' }]}
          >
            <InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="请输入库存数量" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={3} placeholder="请输入商品描述" />
          </Form.Item>
          <Form.Item name="status" label="是否上架" valuePropName="checked">
            <Switch checkedChildren="上架" unCheckedChildren="下架" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
