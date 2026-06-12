import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Form, InputNumber, Spin, message } from 'antd'
import request from '@/utils/request'
import type { ApiResponse } from 'shared/types/api'

interface PointsConfig {
  register_points: number
  first_purchase_points: number
  purchase_rate: number
  referral_points: number
  daily_sign_points: number
}

export default function PointsConfig() {
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  const fetchConfig = useCallback(() => {
    setLoading(true)
    request
      .get<ApiResponse<PointsConfig>>('/admin/points/config')
      .then((res) => {
        const data = res.data.data
        form.setFieldsValue({
          register_points: data.register_points ?? 0,
          first_purchase_points: data.first_purchase_points ?? 0,
          purchase_rate: data.purchase_rate ?? 0,
          referral_points: data.referral_points ?? 0,
          daily_sign_points: data.daily_sign_points ?? 0,
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [form])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)
      await request.put<ApiResponse>('/admin/points/config', {
        register_points: values.register_points ?? 0,
        first_purchase_points: values.first_purchase_points ?? 0,
        purchase_rate: values.purchase_rate ?? 0,
        referral_points: values.referral_points ?? 0,
        daily_sign_points: values.daily_sign_points ?? 0,
      })
      message.success('保存成功')
    } catch {
      // validation or request error
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Spin spinning={loading}>
      <Card title="积分规则配置" style={{ maxWidth: 600 }}>
        <Form form={form} layout="vertical">
          <Form.Item
            name="register_points"
            label="注册赠送积分"
            rules={[{ required: true, message: '请输入注册赠送积分' }]}
          >
            <InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="新用户注册赠送的积分" />
          </Form.Item>
          <Form.Item
            name="first_purchase_points"
            label="首次购买赠送积分"
            rules={[{ required: true, message: '请输入首次购买赠送积分' }]}
          >
            <InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="首次下单赠送的额外积分" />
          </Form.Item>
          <Form.Item
            name="purchase_rate"
            label="消费积分比例（每元获得积分）"
            rules={[{ required: true, message: '请输入消费积分比例' }]}
          >
            <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="每消费1元获得的积分" />
          </Form.Item>
          <Form.Item
            name="referral_points"
            label="推荐奖励积分"
            rules={[{ required: true, message: '请输入推荐奖励积分' }]}
          >
            <InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="成功推荐新用户获得的积分" />
          </Form.Item>
          <Form.Item
            name="daily_sign_points"
            label="每日签到积分"
            rules={[{ required: true, message: '请输入每日签到积分' }]}
          >
            <InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="每日签到获得的积分" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" onClick={handleSave} loading={submitting}>
              保存配置
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </Spin>
  )
}
