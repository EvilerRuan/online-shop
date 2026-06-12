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
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  message,
} from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import request from '@/utils/request'
import type { ApiResponse } from 'shared/types/api'

/* ───────── Types ───────── */

interface Banner {
  id: number
  image_url: string
  link_url: string
  sort_order: number
  status: boolean
}

interface QuickIcon {
  id: number
  name: string
  icon_url: string
  link_url: string
  sort_order: number
}

interface RecommendProduct {
  id: number
  product_id: number
  product_name: string
  sort_order: number
}

interface ProductOption {
  id: number
  name: string
}

/* ───────── Banner Tab ───────── */

function BannerTab() {
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<Banner[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Banner | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  const fetchList = useCallback(() => {
    setLoading(true)
    request
      .get<ApiResponse<Banner[]>>('/admin/retail-home-config/banners')
      .then((res) => {
        const data = res.data.data
        setDataSource(Array.isArray(data) ? data : [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const openAdd = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ sort_order: 0, status: true })
    setModalOpen(true)
  }

  const openEdit = (record: Banner) => {
    setEditing(record)
    form.setFieldsValue({
      image_url: record.image_url,
      link_url: record.link_url,
      sort_order: record.sort_order,
      status: record.status,
    })
    setModalOpen(true)
  }

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)
      const payload = {
        image_url: values.image_url,
        link_url: values.link_url || '',
        sort_order: values.sort_order ?? 0,
        status: values.status ?? true,
      }
      if (editing) {
        await request.put<ApiResponse>(`/admin/retail-home-config/banners/${editing.id}`, payload)
        message.success('编辑成功')
      } else {
        await request.post<ApiResponse>('/admin/retail-home-config/banners', payload)
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
      .delete<ApiResponse>(`/admin/retail-home-config/banners/${id}`)
      .then(() => {
        message.success('删除成功')
        fetchList()
      })
      .catch(() => {})
  }

  const columns: ColumnsType<Banner> = [
    {
      title: '图片预览',
      dataIndex: 'image_url',
      key: 'image_url',
      width: 120,
      render: (url: string) =>
        url ? <Image src={url} width={80} height={40} style={{ objectFit: 'cover' }} /> : '-',
    },
    { title: '链接地址', dataIndex: 'link_url', key: 'link_url', ellipsis: true },
    { title: '排序权重', dataIndex: 'sort_order', key: 'sort_order', width: 100, align: 'center' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      align: 'center',
      render: (val: boolean) => (val ? '启用' : '禁用'),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_: unknown, record: Banner) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定删除该轮播图吗？"
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
    <>
      <Card
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
            添加轮播图
          </Button>
        }
      >
        <Table<Banner>
          rowKey="id"
          columns={columns}
          dataSource={dataSource}
          loading={loading}
          pagination={false}
        />
      </Card>

      <Modal
        title={editing ? '编辑轮播图' : '添加轮播图'}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            name="image_url"
            label="图片地址"
            rules={[{ required: true, message: '请输入图片地址' }]}
          >
            <Input placeholder="请输入图片URL" />
          </Form.Item>
          <Form.Item name="link_url" label="链接地址">
            <Input placeholder="请输入链接地址" />
          </Form.Item>
          <Form.Item name="sort_order" label="排序权重">
            <InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="数值越小越靠前" />
          </Form.Item>
          <Form.Item name="status" label="是否启用" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

/* ───────── Quick Icon Tab ───────── */

function QuickIconTab() {
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<QuickIcon[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<QuickIcon | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  const fetchList = useCallback(() => {
    setLoading(true)
    request
      .get<ApiResponse<QuickIcon[]>>('/admin/retail-home-config/quick-icons')
      .then((res) => {
        const data = res.data.data
        setDataSource(Array.isArray(data) ? data : [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const openAdd = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ sort_order: 0 })
    setModalOpen(true)
  }

  const openEdit = (record: QuickIcon) => {
    setEditing(record)
    form.setFieldsValue({
      name: record.name,
      icon_url: record.icon_url,
      link_url: record.link_url,
      sort_order: record.sort_order,
    })
    setModalOpen(true)
  }

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)
      const payload = {
        name: values.name,
        icon_url: values.icon_url,
        link_url: values.link_url || '',
        sort_order: values.sort_order ?? 0,
      }
      if (editing) {
        await request.put<ApiResponse>(`/admin/retail-home-config/quick-icons/${editing.id}`, payload)
        message.success('编辑成功')
      } else {
        await request.post<ApiResponse>('/admin/retail-home-config/quick-icons', payload)
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
      .delete<ApiResponse>(`/admin/retail-home-config/quick-icons/${id}`)
      .then(() => {
        message.success('删除成功')
        fetchList()
      })
      .catch(() => {})
  }

  const columns: ColumnsType<QuickIcon> = [
    {
      title: '图标预览',
      dataIndex: 'icon_url',
      key: 'icon_url',
      width: 80,
      render: (url: string) =>
        url ? <Image src={url} width={40} height={40} style={{ objectFit: 'cover' }} /> : '-',
    },
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '链接地址', dataIndex: 'link_url', key: 'link_url', ellipsis: true },
    { title: '排序权重', dataIndex: 'sort_order', key: 'sort_order', width: 100, align: 'center' },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_: unknown, record: QuickIcon) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定删除该图标吗？"
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
    <>
      <Card
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
            添加金刚区图标
          </Button>
        }
      >
        <Table<QuickIcon>
          rowKey="id"
          columns={columns}
          dataSource={dataSource}
          loading={loading}
          pagination={false}
        />
      </Card>

      <Modal
        title={editing ? '编辑金刚区图标' : '添加金刚区图标'}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder="请输入名称" />
          </Form.Item>
          <Form.Item
            name="icon_url"
            label="图标地址"
            rules={[{ required: true, message: '请输入图标地址' }]}
          >
            <Input placeholder="请输入图标URL" />
          </Form.Item>
          <Form.Item name="link_url" label="链接地址">
            <Input placeholder="请输入链接地址" />
          </Form.Item>
          <Form.Item name="sort_order" label="排序权重">
            <InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="数值越小越靠前" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

/* ───────── Recommend Product Tab ───────── */

function RecommendProductTab() {
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<RecommendProduct[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [productOptions, setProductOptions] = useState<ProductOption[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState<number | undefined>(undefined)
  const [sortOrder, setSortOrder] = useState<number>(0)

  const fetchList = useCallback(() => {
    setLoading(true)
    request
      .get<ApiResponse<RecommendProduct[]>>('/admin/retail-home-config/products')
      .then((res) => {
        const data = res.data.data
        setDataSource(Array.isArray(data) ? data : [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const handleSearchProduct = (keyword: string) => {
    if (!keyword) {
      setProductOptions([])
      return
    }
    setSearching(true)
    request
      .get<ApiResponse<{ list: ProductOption[] }>>('/admin/products', {
        params: { keyword, page: 1, page_size: 20 },
      })
      .then((res) => {
        const data = res.data.data
        setProductOptions(Array.isArray(data) ? data : data.list ?? [])
      })
      .catch(() => {})
      .finally(() => setSearching(false))
  }

  const openAdd = () => {
    setSelectedProductId(undefined)
    setSortOrder(0)
    setProductOptions([])
    setModalOpen(true)
  }

  const handleOk = async () => {
    if (!selectedProductId) {
      message.error('请选择商品')
      return
    }
    setSubmitting(true)
    try {
      await request.post<ApiResponse>('/admin/retail-home-config/products', {
        product_id: selectedProductId,
        sort_order: sortOrder,
      })
      message.success('添加成功')
      setModalOpen(false)
      fetchList()
    } catch {
      // request error
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = (id: number) => {
    request
      .delete<ApiResponse>(`/admin/retail-home-config/products/${id}`)
      .then(() => {
        message.success('删除成功')
        fetchList()
      })
      .catch(() => {})
  }

  const columns: ColumnsType<RecommendProduct> = [
    { title: '商品名称', dataIndex: 'product_name', key: 'product_name' },
    { title: '排序权重', dataIndex: 'sort_order', key: 'sort_order', width: 100, align: 'center' },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, record: RecommendProduct) => (
        <Popconfirm
          title="确定删除该推荐商品吗？"
          onConfirm={() => handleDelete(record.id)}
          okText="确定"
          cancelText="取消"
        >
          <Button type="link" size="small" danger>
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ]

  return (
    <>
      <Card
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
            添加推荐商品
          </Button>
        }
      >
        <Table<RecommendProduct>
          rowKey="id"
          columns={columns}
          dataSource={dataSource}
          loading={loading}
          pagination={false}
        />
      </Card>

      <Modal
        title="添加推荐商品"
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form layout="vertical">
          <Form.Item label="选择商品" required>
            <Select
              showSearch
              placeholder="请输入商品名称搜索"
              filterOption={false}
              onSearch={handleSearchProduct}
              loading={searching}
              value={selectedProductId}
              onChange={(val) => setSelectedProductId(val)}
              notFoundContent={searching ? '搜索中...' : '无匹配结果'}
              options={productOptions.map((p) => ({ label: p.name, value: p.id }))}
            />
          </Form.Item>
          <Form.Item label="排序权重">
            <InputNumber
              min={0}
              precision={0}
              style={{ width: '100%' }}
              value={sortOrder}
              onChange={(val) => setSortOrder(val ?? 0)}
              placeholder="数值越小越靠前"
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

/* ───────── Main Page ───────── */

export default function RetailHomeConfig() {
  const tabItems = [
    { key: 'banners', label: '轮播图', children: <BannerTab /> },
    { key: 'quick-icons', label: '金刚区', children: <QuickIconTab /> },
    { key: 'products', label: '推荐商品', children: <RecommendProductTab /> },
  ]

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>零售首页配置</h2>
      <Tabs items={tabItems} defaultActiveKey="banners" />
    </div>
  )
}
