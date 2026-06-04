import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Card,
  Form,
  Image,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  TreeSelect,
  message,
} from 'antd'
import { PlusOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useNavigate } from 'react-router-dom'
import request from '@/utils/request'
import type { ApiResponse, PaginatedResponse } from 'shared/types/api'
import type { Category } from 'shared/types/category'
import { formatPrice } from 'shared/utils/format'

interface ProductListRow {
  id: number
  name: string
  product_no: string
  main_image: string | null
  category_path: string
  price: number
  stock: number
  sales_count: number
  status: 'active' | 'inactive'
}

interface CategoryTreeNode extends Category {
  children?: CategoryTreeNode[]
}

export default function ProductList() {
  const navigate = useNavigate()
  const [form] = Form.useForm()

  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<ProductListRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [categories, setCategories] = useState<CategoryTreeNode[]>([])

  const fetchCategories = useCallback(() => {
    request
      .get<ApiResponse<CategoryTreeNode[]>>('/admin/categories')
      .then((res) => setCategories(res.data.data))
      .catch(() => {})
  }, [])

  const fetchProducts = useCallback(() => {
    setLoading(true)
    const values = form.getFieldsValue()
    request
      .get<PaginatedResponse<ProductListRow>>('/admin/products', {
        params: {
          page,
          page_size: pageSize,
          name: values.name || undefined,
          category_id: values.category_id || undefined,
          status: values.status || undefined,
        },
      })
      .then((res) => {
        setDataSource(res.data.data.list)
        setTotal(res.data.data.total)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [form, page, pageSize])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleSearch = () => {
    setPage(1)
    fetchProducts()
  }

  const handleReset = () => {
    form.resetFields()
    setPage(1)
  }

  const handleToggleStatus = (record: ProductListRow) => {
    const newStatus = record.status === 'active' ? 'inactive' : 'active'
    request
      .patch<ApiResponse>(`/admin/products/${record.id}/status`, { status: newStatus })
      .then(() => {
        message.success(newStatus === 'active' ? '已上架' : '已下架')
        fetchProducts()
      })
      .catch(() => {})
  }

  const handleDelete = (id: number) => {
    request
      .delete<ApiResponse>(`/admin/products/${id}`)
      .then(() => {
        message.success('删除成功')
        fetchProducts()
      })
      .catch(() => {})
  }

  const columns: ColumnsType<ProductListRow> = [
    {
      title: '商品图片',
      dataIndex: 'main_image',
      key: 'main_image',
      width: 80,
      render: (url: string | null) =>
        url ? (
          <Image src={url} width={50} height={50} style={{ objectFit: 'cover', borderRadius: 4 }} />
        ) : (
          <div
            style={{
              width: 50,
              height: 50,
              background: '#f5f5f5',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#bfbfbf',
              fontSize: 12,
            }}
          >
            无图
          </div>
        ),
    },
    {
      title: '商品名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: '商品编号',
      dataIndex: 'product_no',
      key: 'product_no',
      width: 100,
    },
    {
      title: '分类',
      dataIndex: 'category_path',
      key: 'category_path',
      width: 140,
      ellipsis: true,
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      width: 100,
      render: (price: number) => formatPrice(price),
    },
    {
      title: '库存',
      dataIndex: 'stock',
      key: 'stock',
      width: 80,
      align: 'center',
    },
    {
      title: '销量',
      dataIndex: 'sales_count',
      key: 'sales_count',
      width: 80,
      align: 'center',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      align: 'center',
      render: (status: string) =>
        status === 'active' ? (
          <Tag color="green">上架</Tag>
        ) : (
          <Tag color="default">下架</Tag>
        ),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: unknown, record: ProductListRow) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => navigate(`/admin/products/edit/${record.id}`)}>
            编辑
          </Button>
          <Button type="link" size="small" onClick={() => handleToggleStatus(record)}>
            {record.status === 'active' ? '下架' : '上架'}
          </Button>
          <Popconfirm title="确定删除该商品吗？" onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消">
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
      <Card style={{ marginBottom: 16 }}>
        <Form form={form} layout="inline">
          <Form.Item name="name" label="商品名称">
            <Input placeholder="请输入商品名称" allowClear style={{ width: 180 }} />
          </Form.Item>
          <Form.Item name="category_id" label="分类">
            <TreeSelect
              placeholder="请选择分类"
              allowClear
              style={{ width: 180 }}
              treeData={categories}
              fieldNames={{ label: 'name', value: 'id', children: 'children' }}
              treeDefaultExpandAll
            />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select placeholder="请选择状态" allowClear style={{ width: 120 }}>
              <Select.Option value="active">上架</Select.Option>
              <Select.Option value="inactive">下架</Select.Option>
            </Select>
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
        title="商品列表"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/admin/products/edit')}>
            添加商品
          </Button>
        }
      >
        <Table<ProductListRow>
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
