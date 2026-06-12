import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Card,
  Descriptions,
  Form,
  Image,
  Input,
  Modal,
  Space,
  Spin,
  Tag,
  Timeline,
  message,
} from 'antd'
import { useNavigate, useParams } from 'react-router-dom'
import request from '@/utils/request'
import type { ApiResponse } from 'shared/types/api'
import { formatDateTime } from 'shared/utils/format'

interface AfterSaleDetail {
  id: number
  order_no: string
  type: 'refund' | 'return_refund'
  user_name: string
  reason: string
  images: string[]
  refund_amount: number
  status: 'pending' | 'processing' | 'approved' | 'rejected' | 'completed'
  reject_reason: string | null
  timeline: { time: string; content: string }[]
  created_at: string
}

const TYPE_LABELS: Record<string, string> = {
  refund: '仅退款',
  return_refund: '退货退款',
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: '待处理', color: 'orange' },
  processing: { label: '处理中', color: 'blue' },
  approved: { label: '已同意', color: 'cyan' },
  rejected: { label: '已拒绝', color: 'red' },
  completed: { label: '已完成', color: 'green' },
}

export default function AfterSalesDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState<AfterSaleDetail | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectForm] = Form.useForm()

  const fetchDetail = useCallback(() => {
    if (!id) return
    setLoading(true)
    request
      .get<ApiResponse<AfterSaleDetail>>(`/admin/after-sales/${id}`)
      .then((res) => setDetail(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  const handleApprove = async () => {
    setSubmitting(true)
    try {
      await request.post<ApiResponse>(`/admin/after-sales/${id}/approve`)
      message.success('已同意售后')
      fetchDetail()
    } catch {
      message.error('操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    try {
      const values = await rejectForm.validateFields()
      setSubmitting(true)
      await request.post<ApiResponse>(`/admin/after-sales/${id}/reject`, {
        reject_reason: values.reject_reason,
      })
      message.success('已拒绝售后')
      setRejectModalOpen(false)
      fetchDetail()
    } catch {
      // validation or request error
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmReturn = async () => {
    setSubmitting(true)
    try {
      await request.post<ApiResponse>(`/admin/after-sales/${id}/confirm-return`)
      message.success('已确认收到退货')
      fetchDetail()
    } catch {
      message.error('操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading && !detail) {
    return <Card loading />
  }

  if (!detail) {
    return <Card>售后记录不存在</Card>
  }

  const statusConfig = STATUS_CONFIG[detail.status]

  return (
    <Spin spinning={loading}>
      <Card
        title="售后详情"
        extra={
          <Button onClick={() => navigate('/admin/after-sales')}>返回列表</Button>
        }
        style={{ marginBottom: 16 }}
      >
        <Descriptions column={2}>
          <Descriptions.Item label="订单号">{detail.order_no}</Descriptions.Item>
          <Descriptions.Item label="申请时间">{formatDateTime(detail.created_at)}</Descriptions.Item>
          <Descriptions.Item label="售后类型">{TYPE_LABELS[detail.type] || detail.type}</Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={statusConfig?.color}>{statusConfig?.label || detail.status}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="用户名">{detail.user_name}</Descriptions.Item>
          <Descriptions.Item label="退款金额">
            <span style={{ fontWeight: 600, color: '#f5222d' }}>¥{detail.refund_amount}</span>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="退款原因" style={{ marginBottom: 16 }}>
        <p>{detail.reason}</p>
        {detail.images && detail.images.length > 0 && (
          <Space wrap style={{ marginTop: 12 }}>
            {detail.images.map((url, index) => (
              <Image
                key={index}
                src={url}
                width={100}
                height={100}
                style={{ objectFit: 'cover', borderRadius: 4 }}
              />
            ))}
          </Space>
        )}
        {detail.reject_reason && (
          <div style={{ marginTop: 12, color: '#f5222d' }}>
            <strong>拒绝原因：</strong>{detail.reject_reason}
          </div>
        )}
      </Card>

      {detail.timeline && detail.timeline.length > 0 && (
        <Card title="处理时间线" style={{ marginBottom: 16 }}>
          <Timeline
            items={detail.timeline.map((item) => ({
              children: (
                <div>
                  <div>{item.content}</div>
                  <div style={{ color: '#999', fontSize: 12 }}>{formatDateTime(item.time)}</div>
                </div>
              ),
            }))}
          />
        </Card>
      )}

      <Card title="操作">
        <Space>
          {detail.status === 'pending' && (
            <>
              <Button
                type="primary"
                onClick={handleApprove}
                loading={submitting}
              >
                同意
              </Button>
              <Button
                danger
                onClick={() => {
                  rejectForm.resetFields()
                  setRejectModalOpen(true)
                }}
              >
                拒绝
              </Button>
            </>
          )}
          {detail.status === 'processing' && detail.type === 'return_refund' && (
            <Button
              type="primary"
              onClick={handleConfirmReturn}
              loading={submitting}
            >
              确认收到退货
            </Button>
          )}
        </Space>
      </Card>

      <Modal
        title="拒绝售后"
        open={rejectModalOpen}
        onOk={handleReject}
        onCancel={() => {
          setRejectModalOpen(false)
          rejectForm.resetFields()
        }}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={rejectForm} layout="vertical" preserve={false}>
          <Form.Item
            name="reject_reason"
            label="拒绝原因"
            rules={[{ required: true, message: '请输入拒绝原因' }]}
          >
            <Input.TextArea rows={3} placeholder="请输入拒绝原因" />
          </Form.Item>
        </Form>
      </Modal>
    </Spin>
  )
}
