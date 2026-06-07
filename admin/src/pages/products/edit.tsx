import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Card,
  Divider,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Spin,
  TreeSelect,
  Upload,
  message,
} from 'antd'
import { PlusOutlined, MinusCircleOutlined, UploadOutlined } from '@ant-design/icons'
import type { UploadFile, UploadProps } from 'antd/es/upload/interface'
import { useNavigate, useParams } from 'react-router-dom'
import request from '@/utils/request'
import type { ApiResponse } from 'shared/types/api'
import type { ProductDetail, ProductSku } from 'shared/types/product'
import type { Category } from 'shared/types/category'

interface CategoryTreeNode extends Category {
  children?: CategoryTreeNode[]
}

interface SkuFormItem {
  sku_name: string
  quantity: number
}

interface ProductFormValues {
  name: string
  category_id: number
  price: number
  stock: number
  min_order_qty: number
  description?: string
  skus: SkuFormItem[]
}

export default function ProductEdit() {
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const isEdit = Boolean(id)
  const [form] = Form.useForm<ProductFormValues>()

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [categories, setCategories] = useState<CategoryTreeNode[]>([])
  const [specNames, setSpecNames] = useState<{ id: number; name: string }[]>([])
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [uploading, setUploading] = useState(false)

  const fetchCategories = useCallback(() => {
    request
      .get<ApiResponse<CategoryTreeNode[]>>('/admin/categories')
      .then((res) => setCategories(res.data.data))
      .catch(() => {})
  }, [])

  const fetchSpecNames = useCallback(() => {
    request
      .get<ApiResponse<{ id: number; name: string }[]>>('/admin/spec-names')
      .then((res) => setSpecNames(res.data.data))
      .catch(() => {})
  }, [])

  const fetchProduct = useCallback(() => {
    if (!id) return
    setLoading(true)
    request
      .get<ApiResponse<ProductDetail>>(`/admin/products/${id}`)
      .then((res) => {
        const detail = res.data.data
        form.setFieldsValue({
          name: detail.name,
          category_id: detail.category_id,
          price: detail.price ?? 0,
          stock: detail.stock ?? 0,
          min_order_qty: detail.min_order_qty ?? 1,
          description: detail.description,
          skus: detail.skus.map((sku: ProductSku) => ({
            sku_name: sku.sku_name,
            quantity: sku.quantity ?? 0,
          })),
        })
        if (detail.main_image) {
          setFileList([
            {
              uid: '-1',
              name: 'image',
              status: 'done',
              url: detail.main_image,
            },
          ])
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id, form])

  useEffect(() => {
    fetchCategories()
    fetchSpecNames()
  }, [fetchCategories, fetchSpecNames])

  useEffect(() => {
    fetchProduct()
  }, [fetchProduct])

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

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)

      const mainImage = fileList.length > 0 ? fileList[0].url : undefined
      const payload = {
        name: values.name,
        category_id: values.category_id,
        main_image: mainImage,
        price: values.price,
        stock: values.stock,
        min_order_qty: values.min_order_qty ?? 1,
        description: values.description || '',
        skus: values.skus.map((sku) => ({
          sku_name: sku.sku_name,
          quantity: sku.quantity ?? 0,
        })),
      }

      if (isEdit) {
        await request.put<ApiResponse>(`/admin/products/${id}`, payload)
        message.success('编辑成功')
      } else {
        await request.post<ApiResponse>('/admin/products', payload)
        message.success('添加成功')
      }
      navigate('/admin/products')
    } catch {
      // validation or request error handled by interceptor
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <Card title={isEdit ? '编辑商品' : '添加商品'}>
      <Form
        form={form}
        layout="vertical"
        style={{ maxWidth: 700 }}
        initialValues={{
          price: 0,
          stock: 0,
          min_order_qty: 1,
          skus: [{ sku_name: '', quantity: 0 }],
        }}
      >
        <Form.Item
          name="name"
          label="商品名称"
          rules={[{ required: true, message: '请输入商品名称' }]}
        >
          <Input placeholder="请输入商品名称" />
        </Form.Item>

        <Form.Item
          name="category_id"
          label="分类"
          rules={[{ required: true, message: '请选择分类' }]}
        >
          <TreeSelect
            placeholder="请选择分类"
            treeData={categories}
            fieldNames={{ label: 'name', value: 'id', children: 'children' }}
            treeDefaultExpandAll
          />
        </Form.Item>

        <Form.Item label="商品主图">
          <Upload {...uploadProps}>
            <Button icon={<UploadOutlined />} loading={uploading}>
              {uploading ? '上传中...' : '上传图片'}
            </Button>
          </Upload>
        </Form.Item>

        <Space size={16} wrap>
          <Form.Item
            name="price"
            label="价格"
            rules={[{ required: true, message: '请输入价格' }]}
          >
            <InputNumber
              min={0}
              precision={2}
              placeholder="价格"
              style={{ width: 150 }}
              addonAfter="元"
            />
          </Form.Item>
          <Form.Item
            name="stock"
            label="库存"
            rules={[{ required: true, message: '请输入库存' }]}
          >
            <InputNumber min={0} precision={0} placeholder="库存" style={{ width: 150 }} />
          </Form.Item>
          <Form.Item
            name="min_order_qty"
            label="最低订购量"
            rules={[{ required: true, message: '请输入最低订购量' }]}
          >
            <InputNumber min={1} precision={0} placeholder="默认1" style={{ width: 150 }} />
          </Form.Item>
        </Space>

        <Form.Item name="description" label="商品描述">
          <Input.TextArea rows={4} placeholder="请输入商品描述" />
        </Form.Item>

        <Divider>规格列表</Divider>

        <Form.Item label="" required>
          <Form.List
            name="skus"
            rules={[
              {
                validator: async (_, skus) => {
                  if (!skus || skus.length === 0) {
                    throw new Error('请至少添加一个规格')
                  }
                },
              },
            ]}
          >
            {(fields, { add, remove }, { errors }) => (
              <>
                {fields.map((field, index) => (
                  <Card
                    key={field.key}
                    size="small"
                    title={`规格 ${index + 1}`}
                    style={{ marginBottom: 12 }}
                    extra={
                      fields.length > 1 ? (
                        <Button
                          type="text"
                          danger
                          icon={<MinusCircleOutlined />}
                          onClick={() => remove(field.name)}
                        />
                      ) : null
                    }
                  >
                    <Space style={{ display: 'flex', flexWrap: 'wrap' }} align="start">
                      <Form.Item
                        {...field}
                        name={[field.name, 'sku_name']}
                        label="规格名称"
                        rules={[{ required: true, message: '请选择规格名称' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Select
                          placeholder="请选择规格"
                          style={{ width: 150 }}
                          options={specNames.map((s) => ({ label: s.name, value: s.name }))}
                        />
                      </Form.Item>
                      <Form.Item
                        {...field}
                        name={[field.name, 'quantity']}
                        label="数量"
                        rules={[{ required: true, message: '请输入数量' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <InputNumber min={0} precision={0} placeholder="数量" style={{ width: 150 }} />
                      </Form.Item>
                    </Space>
                  </Card>
                ))}
                <Button type="dashed" onClick={() => add({ quantity: 0 })} block icon={<PlusOutlined />}>
                  添加规格
                </Button>
                <Form.ErrorList errors={errors} />
              </>
            )}
          </Form.List>
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" loading={submitting} onClick={handleSubmit}>
              保存
            </Button>
            <Button onClick={() => navigate('/admin/products')}>取消</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  )
}
