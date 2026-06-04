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
  Upload,
  message,
} from 'antd'
import { PlusOutlined, UploadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { UploadFile, UploadProps } from 'antd/es/upload/interface'
import request from '@/utils/request'
import type { ApiResponse } from 'shared/types/api'

/* ───────── Types ───────── */

interface Banner {
  id: number
  image_url: string
  title: string
  link_url: string
  sort_order: number
  is_enabled: boolean
}

interface QuickIcon {
  id: number
  icon_url: string
  name: string
  link_url: string
  sort_order: number
  is_enabled: boolean
}

interface HotProduct {
  id: number
  product_id: number
  product_name: string
  product_image: string | null
  sort_order: number
}

interface ProductOption {
  id: number
  name: string
}

/* ───────── Upload helper ───────── */

function useImageUpload() {
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [uploading, setUploading] = useState(false)

  const reset = (url?: string) => {
    if (url) {
      setFileList([{ uid: '-1', name: 'image', status: 'done', url }])
    } else {
      setFileList([])
    }
  }

  const uploadProps: UploadProps = {
    name: 'file',
    listType: 'picture',
    maxCount: 1,
    fileList,
    beforeUpload: (file) => {
      const isImage = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
      const isLt5M = file.size / 1024 / 1024 < 5
      if (!isImage) {
        message.error('仅支持 JPG、PNG、WebP 格式的图片')
        return false
      }
      if (!isLt5M) {
        message.error('文件大小不能超过 5MB')
        return false
      }
      setUploading(true)
      // 立即显示 uploading 状态
      setFileList([
        {
          uid: file.uid,
          name: file.name,
          status: 'uploading',
          percent: 0,
        },
      ])
      return true
    },
    customRequest: async (options) => {
      const file = options.file as File & { uid: string }
      const formData = new FormData()
      formData.append('file', file)
      try {
        options.onProgress?.({ percent: 50 })
        setFileList((prev) =>
          prev.map((f) => (f.uid === file.uid ? { ...f, percent: 50 } : f)),
        )
        const res = await request.post<ApiResponse<{ url: string }>>('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        const url = res.data.data.url
        setFileList([
          {
            uid: file.uid,
            name: file.name,
            status: 'done',
            url,
          },
        ])
        options.onProgress?.({ percent: 100 })
        options.onSuccess?.(res.data)
      } catch (err) {
        setFileList([])
        message.error('上传失败')
        options.onError?.(err as Error)
      } finally {
        setUploading(false)
      }
    },
    onChange: (info) => {
      if (info.file.status === 'uploading') {
        setUploading(true)
      }
    },
    onRemove: () => {
      setFileList([])
    },
  }

  return { fileList, uploading, uploadProps, reset, setFileList }
}

/* ───────── Banner Tab ───────── */

function BannerTab() {
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<Banner[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Banner | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()
  const { fileList, uploading, uploadProps, reset } = useImageUpload()

  const fetchList = useCallback(() => {
    setLoading(true)
    request
      .get<ApiResponse<Banner[]>>('/admin/home-config/banners')
      .then((res) => setDataSource(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const openAdd = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ sort_order: 0, is_enabled: true })
    reset()
    setModalOpen(true)
  }

  const openEdit = (record: Banner) => {
    setEditing(record)
    form.setFieldsValue({
      title: record.title,
      link_url: record.link_url,
      sort_order: record.sort_order,
      is_enabled: record.is_enabled,
    })
    reset(record.image_url)
    setModalOpen(true)
  }

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      const imageUrl = fileList.length > 0 ? fileList[0].url : undefined
      if (!imageUrl) {
        message.error('请上传图片')
        return
      }
      setSubmitting(true)
      const payload = {
        image_url: imageUrl,
        title: values.title,
        link_url: values.link_url || '',
        sort_order: values.sort_order ?? 0,
        is_enabled: values.is_enabled ?? true,
      }
      if (editing) {
        await request.put<ApiResponse>(`/admin/home-config/banners/${editing.id}`, payload)
        message.success('编辑成功')
      } else {
        await request.post<ApiResponse>('/admin/home-config/banners', payload)
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
      .delete<ApiResponse>(`/admin/home-config/banners/${id}`)
      .then(() => {
        message.success('删除成功')
        fetchList()
      })
      .catch(() => {})
  }

  const handleToggle = (record: Banner, checked: boolean) => {
    request
      .put<ApiResponse>(`/admin/home-config/banners/${record.id}`, {
        image_url: record.image_url,
        title: record.title,
        link_url: record.link_url,
        sort_order: record.sort_order,
        is_enabled: checked,
      })
      .then(() => {
        message.success(checked ? '已启用' : '已禁用')
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
      render: (url: string) => url ? <Image src={url} width={80} height={40} style={{ objectFit: 'cover' }} /> : '-',
    },
    { title: '标题', dataIndex: 'title', key: 'title' },
    { title: '链接地址', dataIndex: 'link_url', key: 'link_url', ellipsis: true },
    { title: '排序权重', dataIndex: 'sort_order', key: 'sort_order', width: 100, align: 'center' },
    {
      title: '是否启用',
      dataIndex: 'is_enabled',
      key: 'is_enabled',
      width: 100,
      align: 'center',
      render: (val: boolean, record: Banner) => (
        <Switch checked={val} onChange={(checked) => handleToggle(record, checked)} />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_: unknown, record: Banner) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => openEdit(record)}>编辑</Button>
          <Popconfirm title="确定删除该轮播图吗？" onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消">
            <Button type="link" size="small" danger>删除</Button>
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
          <Form.Item label="图片" required>
            <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />} loading={uploading}>
                {uploading ? '上传中...' : '上传图片'}
              </Button>
            </Upload>
          </Form.Item>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="请输入标题" />
          </Form.Item>
          <Form.Item name="link_url" label="链接地址">
            <Input placeholder="请输入链接地址" />
          </Form.Item>
          <Form.Item name="sort_order" label="排序权重">
            <InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="数值越小越靠前" />
          </Form.Item>
          <Form.Item name="is_enabled" label="是否启用" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

/* ───────── QuickIcon Tab ───────── */

function QuickIconTab() {
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<QuickIcon[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<QuickIcon | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()
  const { fileList, uploading, uploadProps, reset } = useImageUpload()

  const fetchList = useCallback(() => {
    setLoading(true)
    request
      .get<ApiResponse<QuickIcon[]>>('/admin/home-config/quick-icons')
      .then((res) => setDataSource(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const openAdd = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ sort_order: 0, is_enabled: true })
    reset()
    setModalOpen(true)
  }

  const openEdit = (record: QuickIcon) => {
    setEditing(record)
    form.setFieldsValue({
      name: record.name,
      link_url: record.link_url,
      sort_order: record.sort_order,
      is_enabled: record.is_enabled,
    })
    reset(record.icon_url)
    setModalOpen(true)
  }

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      const iconUrl = fileList.length > 0 ? fileList[0].url : undefined
      if (!iconUrl) {
        message.error('请上传图标')
        return
      }
      setSubmitting(true)
      const payload = {
        icon_url: iconUrl,
        name: values.name,
        link_url: values.link_url || '',
        sort_order: values.sort_order ?? 0,
        is_enabled: values.is_enabled ?? true,
      }
      if (editing) {
        await request.put<ApiResponse>(`/admin/home-config/quick-icons/${editing.id}`, payload)
        message.success('编辑成功')
      } else {
        await request.post<ApiResponse>('/admin/home-config/quick-icons', payload)
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
      .delete<ApiResponse>(`/admin/home-config/quick-icons/${id}`)
      .then(() => {
        message.success('删除成功')
        fetchList()
      })
      .catch(() => {})
  }

  const handleToggle = (record: QuickIcon, checked: boolean) => {
    request
      .put<ApiResponse>(`/admin/home-config/quick-icons/${record.id}`, {
        icon_url: record.icon_url,
        name: record.name,
        link_url: record.link_url,
        sort_order: record.sort_order,
        is_enabled: checked,
      })
      .then(() => {
        message.success(checked ? '已启用' : '已禁用')
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
      render: (url: string) => url ? <Image src={url} width={40} height={40} style={{ objectFit: 'cover' }} /> : '-',
    },
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '链接地址', dataIndex: 'link_url', key: 'link_url', ellipsis: true },
    { title: '排序权重', dataIndex: 'sort_order', key: 'sort_order', width: 100, align: 'center' },
    {
      title: '是否启用',
      dataIndex: 'is_enabled',
      key: 'is_enabled',
      width: 100,
      align: 'center',
      render: (val: boolean, record: QuickIcon) => (
        <Switch checked={val} onChange={(checked) => handleToggle(record, checked)} />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_: unknown, record: QuickIcon) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => openEdit(record)}>编辑</Button>
          <Popconfirm title="确定删除该金刚区吗？" onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消">
            <Button type="link" size="small" danger>删除</Button>
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
            添加金刚区
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
        title={editing ? '编辑金刚区' : '添加金刚区'}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item label="图标" required>
            <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />} loading={uploading}>
                {uploading ? '上传中...' : '上传图标'}
              </Button>
            </Upload>
          </Form.Item>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="请输入名称" />
          </Form.Item>
          <Form.Item name="link_url" label="链接地址">
            <Input placeholder="请输入链接地址" />
          </Form.Item>
          <Form.Item name="sort_order" label="排序权重">
            <InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="数值越小越靠前" />
          </Form.Item>
          <Form.Item name="is_enabled" label="是否启用" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

/* ───────── Hot Product Tab ───────── */

function HotProductTab() {
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<HotProduct[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [productOptions, setProductOptions] = useState<ProductOption[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState<number | undefined>(undefined)

  const fetchList = useCallback(() => {
    setLoading(true)
    request
      .get<ApiResponse<HotProduct[]>>('/admin/home-config/products')
      .then((res) => setDataSource(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const handleSearch = (keyword: string) => {
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
      await request.post<ApiResponse>('/admin/home-config/products', {
        product_id: selectedProductId,
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
      .delete<ApiResponse>(`/admin/home-config/products/${id}`)
      .then(() => {
        message.success('删除成功')
        fetchList()
      })
      .catch(() => {})
  }

  const columns: ColumnsType<HotProduct> = [
    {
      title: '商品图片',
      dataIndex: 'product_image',
      key: 'product_image',
      width: 100,
      render: (url: string | null) => url ? <Image src={url} width={60} height={60} style={{ objectFit: 'cover' }} /> : '-',
    },
    { title: '商品名称', dataIndex: 'product_name', key: 'product_name' },
    { title: '排序', dataIndex: 'sort_order', key: 'sort_order', width: 100, align: 'center' },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, record: HotProduct) => (
        <Popconfirm title="确定删除该热销商品吗？" onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消">
          <Button type="link" size="small" danger>删除</Button>
        </Popconfirm>
      ),
    },
  ]

  return (
    <>
      <Card
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
            添加热销商品
          </Button>
        }
      >
        <Table<HotProduct>
          rowKey="id"
          columns={columns}
          dataSource={dataSource}
          loading={loading}
          pagination={false}
        />
      </Card>

      <Modal
        title="添加热销商品"
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
              onSearch={handleSearch}
              loading={searching}
              value={selectedProductId}
              onChange={(val) => setSelectedProductId(val)}
              notFoundContent={searching ? '搜索中...' : '无匹配结果'}
              options={productOptions.map((p) => ({ label: p.name, value: p.id }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

/* ───────── Main Page ───────── */

export default function HomeConfig() {
  const tabItems = [
    { key: 'banners', label: '轮播图管理', children: <BannerTab /> },
    { key: 'quick-icons', label: '金刚区管理', children: <QuickIconTab /> },
    { key: 'products', label: '热销商品管理', children: <HotProductTab /> },
  ]

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>首页配置</h2>
      <Tabs items={tabItems} defaultActiveKey="banners" />
    </div>
  )
}
