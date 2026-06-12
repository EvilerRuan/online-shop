import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  message,
} from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import request from '@/utils/request'
import type { ApiResponse } from 'shared/types/api'

interface ShippingFeeRule {
  id: number
  province: string
  city: string
  fee_type: 'fixed' | 'free_threshold' | 'free'
  base_fee: number
  free_threshold_amount: number | null
}

const FEE_TYPE_LABELS: Record<string, string> = {
  fixed: '固定运费',
  free_threshold: '满额包邮',
  free: '包邮',
}

const FEE_TYPE_OPTIONS = [
  { label: '固定运费', value: 'fixed' },
  { label: '满额包邮', value: 'free_threshold' },
  { label: '包邮', value: 'free' },
]

export default function ShippingFees() {
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<ShippingFeeRule[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ShippingFeeRule | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  const feeType = Form.useWatch('fee_type', form)

  const fetchList = useCallback(() => {
    setLoading(true)
    request
      .get<ApiResponse<{ list: ShippingFeeRule[]; total: number }>>('/admin/shipping-fees', {
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
    form.setFieldsValue({ fee_type: 'fixed' })
    setModalOpen(true)
  }

  const openEdit = (record: ShippingFeeRule) => {
    setEditing(record)
    form.setFieldsValue({
      province: record.province,
      city: record.city,
      fee_type: record.fee_type,
      base_fee: record.base_fee,
      free_threshold_amount: record.free_threshold_amount,
    })
    setModalOpen(true)
  }

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)
      const payload = {
        province: values.province,
        city: values.city,
        fee_type: values.fee_type,
        base_fee: values.fee_type === 'free' ? 0 : (values.base_fee ?? 0),
        free_threshold_amount:
          values.fee_type === 'free_threshold' ? values.free_threshold_amount : null,
      }
      if (editing) {
        await request.put<ApiResponse>(`/admin/shipping-fees/${editing.id}`, payload)
        message.success('编辑成功')
      } else {
        await request.post<ApiResponse>('/admin/shipping-fees', payload)
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
      .delete<ApiResponse>(`/admin/shipping-fees/${id}`)
      .then(() => {
        message.success('删除成功')
        fetchList()
      })
      .catch(() => {})
  }

  const columns: ColumnsType<ShippingFeeRule> = [
    { title: '省份', dataIndex: 'province', key: 'province' },
    { title: '城市', dataIndex: 'city', key: 'city' },
    {
      title: '运费类型',
      dataIndex: 'fee_type',
      key: 'fee_type',
      render: (val: string) => FEE_TYPE_LABELS[val] || val,
    },
    {
      title: '基础运费',
      dataIndex: 'base_fee',
      key: 'base_fee',
      render: (val: number, record: ShippingFeeRule) =>
        record.fee_type === 'free' ? '-' : `¥${val}`,
    },
    {
      title: '包邮门槛金额',
      dataIndex: 'free_threshold_amount',
      key: 'free_threshold_amount',
      render: (val: number | null, record: ShippingFeeRule) =>
        record.fee_type === 'free_threshold' && val ? `¥${val}` : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_: unknown, record: ShippingFeeRule) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定删除该规则吗？"
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
        title="运费规则管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
            新增规则
          </Button>
        }
      >
        <Table<ShippingFeeRule>
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
        title={editing ? '编辑运费规则' : '新增运费规则'}
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
            name="province"
            label="省份"
            rules={[{ required: true, message: '请输入省份' }]}
          >
            <Input placeholder="请输入省份" />
          </Form.Item>
          <Form.Item name="city" label="城市">
            <Input placeholder="请输入城市（选填）" />
          </Form.Item>
          <Form.Item
            name="fee_type"
            label="运费类型"
            rules={[{ required: true, message: '请选择运费类型' }]}
          >
            <Select options={FEE_TYPE_OPTIONS} placeholder="请选择运费类型" />
          </Form.Item>
          {(feeType === 'fixed' || feeType === 'free_threshold') && (
            <Form.Item
              name="base_fee"
              label="基础运费"
              rules={[{ required: true, message: '请输入基础运费' }]}
            >
              <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="请输入基础运费" />
            </Form.Item>
          )}
          {feeType === 'free_threshold' && (
            <Form.Item
              name="free_threshold_amount"
              label="包邮门槛金额"
              rules={[{ required: true, message: '请输入包邮门槛金额' }]}
            >
              <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="满此金额包邮" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  )
}
