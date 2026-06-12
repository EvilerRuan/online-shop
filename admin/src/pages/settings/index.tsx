import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Form, Input, InputNumber, Spin, Tabs, message } from 'antd'
import request from '@/utils/request'
import type { ApiResponse } from 'shared/types/api'

interface SettingsData {
  merchant_intro: string
  merchant_notice: string
  buyer_notice: string
  default_shipping_fee: number
  default_free_threshold: number
  customer_service_auto_reply: string
}

const DEFAULT_SETTINGS: SettingsData = {
  merchant_intro: '',
  merchant_notice: '',
  buyer_notice: '',
  default_shipping_fee: 0,
  default_free_threshold: 0,
  customer_service_auto_reply: '',
}

function SettingEditor({
  title,
  value,
  onChange,
  onSave,
  saving,
}: {
  title: string
  value: string
  onChange: (val: string) => void
  onSave: () => void
  saving: boolean
}) {
  return (
    <Card title={title}>
      <Input.TextArea
        rows={12}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`请输入${title}`}
      />
      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <Button type="primary" loading={saving} onClick={onSave}>
          保存
        </Button>
      </div>
    </Card>
  )
}

export default function SystemSettings() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<SettingsData>(DEFAULT_SETTINGS)

  const fetchSettings = useCallback(() => {
    setLoading(true)
    request
      .get<ApiResponse<SettingsData>>('/admin/settings')
      .then((res) => {
        const data = res.data.data
        setSettings({
          merchant_intro: data?.merchant_intro ?? '',
          merchant_notice: data?.merchant_notice ?? '',
          buyer_notice: data?.buyer_notice ?? '',
          default_shipping_fee: data?.default_shipping_fee ?? 0,
          default_free_threshold: data?.default_free_threshold ?? 0,
          customer_service_auto_reply: data?.customer_service_auto_reply ?? '',
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const handleSave = async () => {
    setSaving(true)
    try {
      await request.put<ApiResponse>('/admin/settings', settings)
      message.success('保存成功')
    } catch {
      // request error
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    )
  }

  const tabItems = [
    {
      key: 'merchant_intro',
      label: '商家简介',
      children: (
        <SettingEditor
          title="商家简介"
          value={settings.merchant_intro}
          onChange={(val) => setSettings((prev) => ({ ...prev, merchant_intro: val }))}
          onSave={handleSave}
          saving={saving}
        />
      ),
    },
    {
      key: 'merchant_notice',
      label: '商家公告',
      children: (
        <SettingEditor
          title="商家公告"
          value={settings.merchant_notice}
          onChange={(val) => setSettings((prev) => ({ ...prev, merchant_notice: val }))}
          onSave={handleSave}
          saving={saving}
        />
      ),
    },
    {
      key: 'buyer_notice',
      label: '买家须知',
      children: (
        <SettingEditor
          title="买家须知"
          value={settings.buyer_notice}
          onChange={(val) => setSettings((prev) => ({ ...prev, buyer_notice: val }))}
          onSave={handleSave}
          saving={saving}
        />
      ),
    },
    {
      key: 'retail_config',
      label: '零售端配置',
      children: (
        <Card title="零售端配置">
          <Form layout="vertical" style={{ maxWidth: 500 }}>
            <Form.Item label="默认运费">
              <InputNumber
                min={0}
                precision={2}
                value={settings.default_shipping_fee}
                onChange={(val) =>
                  setSettings((prev) => ({ ...prev, default_shipping_fee: val ?? 0 }))
                }
                addonAfter="元"
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item label="默认包邮门槛">
              <InputNumber
                min={0}
                precision={2}
                value={settings.default_free_threshold}
                onChange={(val) =>
                  setSettings((prev) => ({ ...prev, default_free_threshold: val ?? 0 }))
                }
                addonAfter="元"
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item label="客服自动回复">
              <Input.TextArea
                rows={4}
                value={settings.customer_service_auto_reply}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, customer_service_auto_reply: e.target.value }))
                }
                placeholder="请输入客服自动回复内容"
              />
            </Form.Item>
            <Form.Item>
              <Button type="primary" loading={saving} onClick={handleSave}>
                保存
              </Button>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
  ]

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>系统设置</h2>
      <Tabs items={tabItems} defaultActiveKey="merchant_intro" />
    </div>
  )
}
