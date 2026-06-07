import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Input, Spin, Tabs, message } from 'antd'
import request from '@/utils/request'
import type { ApiResponse } from 'shared/types/api'

interface SettingsData {
  merchant_intro: string
  merchant_notice: string
  buyer_notice: string
}

const DEFAULT_SETTINGS: SettingsData = {
  merchant_intro: '',
  merchant_notice: '',
  buyer_notice: '',
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
  ]

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>系统设置</h2>
      <Tabs items={tabItems} defaultActiveKey="merchant_intro" />
    </div>
  )
}
