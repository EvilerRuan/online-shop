import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Button,
  Card,
  Col,
  Divider,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Popconfirm,
  Row,
  Space,
  Spin,
  Switch,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  AppstoreOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  OrderedListOutlined,
} from '@ant-design/icons'
import request from '@/utils/request'
import type { ApiResponse } from 'shared/types/api'
import type { Category, CategoryRequest } from 'shared/types/category'

const { Text } = Typography

interface CategoryTreeRow extends Category {
  children?: CategoryTreeRow[]
}

export default function CategoryManage() {
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<CategoryTreeRow[]>([])
  const [selectedParent, setSelectedParent] = useState<CategoryTreeRow | null>(null)
  const selectedParentRef = useRef<CategoryTreeRow | null>(null)

  // Keep ref in sync with state
  useEffect(() => {
    selectedParentRef.current = selectedParent
  }, [selectedParent])

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'addParent' | 'addChild' | 'edit'>('addParent')
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  const fetchCategories = useCallback(() => {
    setLoading(true)
    request
      .get<ApiResponse<CategoryTreeRow[]>>('/admin/categories')
      .then((res) => {
        const list = res.data.data
        setDataSource(list)
        const current = selectedParentRef.current
        if (!current || !list.find((c) => c.id === current.id)) {
          setSelectedParent(list[0] ?? null)
        } else {
          const updated = list.find((c) => c.id === current.id)
          if (updated) setSelectedParent(updated)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  // ── Modal helpers ──

  const openAddParentModal = () => {
    setModalMode('addParent')
    setEditingCategory(null)
    form.resetFields()
    form.setFieldsValue({ sort_order: 0, show_in_client: true })
    setModalOpen(true)
  }

  const openAddChildModal = (parentId: number) => {
    setModalMode('addChild')
    setEditingCategory(null)
    form.resetFields()
    form.setFieldsValue({ sort_order: 0, show_in_client: true, _parentId: parentId })
    setModalOpen(true)
  }

  const openEditModal = (record: Category) => {
    setModalMode('edit')
    setEditingCategory(record)
    form.setFieldsValue({
      name: record.name,
      sort_order: record.sort_order,
      show_in_client: record.show_in_client,
      _parentId: record.parent_id,
    })
    setModalOpen(true)
  }

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)

      let parentId: number | null = null
      if (modalMode === 'addChild') {
        parentId = values._parentId
      } else if (modalMode === 'edit') {
        parentId = editingCategory?.parent_id ?? null
      }

      const payload: CategoryRequest = {
        name: values.name,
        parent_id: parentId,
        sort_order: values.sort_order ?? 0,
        show_in_client: values.show_in_client ?? true,
      }

      if (modalMode === 'edit' && editingCategory) {
        await request.put<ApiResponse>(`/admin/categories/${editingCategory.id}`, payload)
        message.success('编辑成功')
      } else {
        await request.post<ApiResponse>('/admin/categories', payload)
        message.success('添加成功')
      }

      setModalOpen(false)
      fetchCategories()
    } catch {
      // validation or request error
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = (id: number) => {
    request
      .delete<ApiResponse>(`/admin/categories/${id}`)
      .then(() => {
        message.success('删除成功')
        fetchCategories()
      })
      .catch(() => {})
  }

  const handleToggleShow = (record: CategoryTreeRow | Category, checked: boolean) => {
    // Optimistic local update: only update the specific record
    setDataSource((prev) =>
      prev.map((parent) => {
        if (parent.id === record.id) {
          return { ...parent, show_in_client: checked }
        }
        if (parent.children) {
          const updatedChildren = parent.children.map((child) =>
            child.id === record.id ? { ...child, show_in_client: checked } : child,
          )
          return { ...parent, children: updatedChildren }
        }
        return parent
      }),
    )
    // Also update selectedParent locally if the toggled item is a child
    setSelectedParent((prev) => {
      if (!prev) return prev
      if (prev.id === record.id) {
        return { ...prev, show_in_client: checked }
      }
      if (prev.children) {
        const updatedChildren = prev.children.map((child) =>
          child.id === record.id ? { ...child, show_in_client: checked } : child,
        )
        return { ...prev, children: updatedChildren }
      }
      return prev
    })

    request
      .put<ApiResponse>(`/admin/categories/${record.id}`, {
        name: record.name,
        parent_id: record.parent_id,
        sort_order: record.sort_order,
        show_in_client: checked,
      })
      .then(() => {
        message.success(checked ? '已显示' : '已隐藏')
      })
      .catch(() => {
        // Rollback on error
        fetchCategories()
      })
  }

  const modalTitle =
    modalMode === 'edit'
      ? '编辑分类'
      : modalMode === 'addChild'
        ? '添加子分类'
        : '添加一级分类'

  return (
    <Spin spinning={loading}>
      <Row gutter={16}>
        {/* ── Left: Parent Categories ── */}
        <Col span={8}>
          <Card
            title={
              <Space>
                <AppstoreOutlined />
                <span>一级分类</span>
                <Tag color="blue">{dataSource.length}</Tag>
              </Space>
            }
            extra={
              <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openAddParentModal}>
                新增
              </Button>
            }
            styles={{ body: { padding: 0 } }}
          >
            {dataSource.length === 0 && !loading ? (
              <Empty description="暂无分类" style={{ padding: 40 }} />
            ) : (
              <List
                dataSource={dataSource}
                renderItem={(item) => {
                  const isSelected = selectedParent?.id === item.id
                  const childCount = item.children?.length ?? 0
                  return (
                    <List.Item
                      onClick={() => setSelectedParent(item)}
                      style={{
                        padding: '12px 16px',
                        cursor: 'pointer',
                        background: isSelected ? '#e6f4ff' : 'transparent',
                        borderLeft: isSelected ? '3px solid #1677ff' : '3px solid transparent',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.background = '#fafafa'
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.background = 'transparent'
                      }}
                      actions={[
                        <Tooltip title="编辑" key="edit">
                          <Button
                            type="text"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={(e) => {
                              e.stopPropagation()
                              openEditModal(item)
                            }}
                          />
                        </Tooltip>,
                        <Tooltip title={item.show_in_client ? '隐藏' : '显示'} key="toggle">
                          <Button
                            type="text"
                            size="small"
                            icon={item.show_in_client ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleToggleShow(item, !item.show_in_client)
                            }}
                          />
                        </Tooltip>,
                        <Popconfirm
                          key="del"
                          title={
                            childCount > 0
                              ? `该分类下有 ${childCount} 个子分类，删除后子分类也会被删除，确定吗？`
                              : '确定删除该分类吗？'
                          }
                          onConfirm={(e) => {
                            e?.stopPropagation()
                            handleDelete(item.id)
                          }}
                          onCancel={(e) => e?.stopPropagation()}
                          okText="确定"
                          cancelText="取消"
                        >
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </Popconfirm>,
                      ]}
                    >
                      <List.Item.Meta
                        title={
                          <Space>
                            <Text strong={isSelected}>{item.name}</Text>
                            {!item.show_in_client && (
                              <Tag color="default" style={{ fontSize: 11 }}>
                                已隐藏
                              </Tag>
                            )}
                          </Space>
                        }
                        description={
                          <Space size={12}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              <OrderedListOutlined /> 权重 {item.sort_order}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              子分类 {childCount}
                            </Text>
                          </Space>
                        }
                      />
                    </List.Item>
                  )
                }}
              />
            )}
          </Card>
        </Col>

        {/* ── Right: Sub-categories ── */}
        <Col span={16}>
          <Card
            title={
              selectedParent ? (
                <Space>
                  <span>{selectedParent.name}</span>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    / 子分类管理
                  </Text>
                </Space>
              ) : (
                '子分类管理'
              )
            }
            extra={
              selectedParent && (
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => openAddChildModal(selectedParent.id)}
                >
                  添加子分类
                </Button>
              )
            }
          >
            {!selectedParent ? (
              <Empty description="请先选择一个一级分类" />
            ) : !selectedParent.children || selectedParent.children.length === 0 ? (
              <Empty
                description={
                  <span>
                    暂无子分类，
                    <a onClick={() => openAddChildModal(selectedParent.id)}>点击添加</a>
                  </span>
                }
              />
            ) : (
              <Row gutter={[12, 12]}>
                {selectedParent.children.map((child) => (
                  <Col key={child.id} xs={24} sm={12} md={8}>
                    <Card
                      size="small"
                      style={{
                        borderRadius: 8,
                        border: child.show_in_client
                          ? '1px solid #d9d9d9'
                          : '1px dashed #d9d9d9',
                      }}
                      styles={{ body: { padding: '12px 16px' } }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                        }}
                      >
                        <div>
                          <Text strong style={{ fontSize: 15 }}>
                            {child.name}
                          </Text>
                          <div style={{ marginTop: 6 }}>
                            <Space size={8}>
                              <Tag
                                color={child.show_in_client ? 'green' : 'default'}
                                icon={child.show_in_client ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                                style={{ margin: 0 }}
                              >
                                {child.show_in_client ? '显示' : '隐藏'}
                              </Tag>
                              <Tag
                                color="blue"
                                icon={<OrderedListOutlined />}
                                style={{ margin: 0 }}
                              >
                                权重 {child.sort_order}
                              </Tag>
                            </Space>
                          </div>
                        </div>
                        <Space size={2}>
                          <Tooltip title="编辑">
                            <Button
                              type="text"
                              size="small"
                              icon={<EditOutlined />}
                              onClick={() => openEditModal(child)}
                            />
                          </Tooltip>
                          <Tooltip title={child.show_in_client ? '隐藏' : '显示'}>
                            <Button
                              type="text"
                              size="small"
                              icon={child.show_in_client ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                              onClick={() => handleToggleShow(child, !child.show_in_client)}
                            />
                          </Tooltip>
                          <Popconfirm
                            title="确定删除该子分类吗？"
                            onConfirm={() => handleDelete(child.id)}
                            okText="确定"
                            cancelText="取消"
                          >
                            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                          </Popconfirm>
                        </Space>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </Card>
        </Col>
      </Row>

      {/* ── Modal ── */}
      <Modal
        title={modalTitle}
        open={modalOpen}
        onOk={handleModalOk}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        destroyOnClose
        width={420}
      >
        <Divider style={{ margin: '12px 0' }} />
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            name="name"
            label="分类名称"
            rules={[{ required: true, message: '请输入分类名称' }]}
            initialValue={editingCategory?.name}
          >
            <Input placeholder="请输入分类名称" maxLength={20} />
          </Form.Item>
          <Form.Item
            name="sort_order"
            label="排序权重"
            tooltip="数值越小排序越靠前"
            initialValue={editingCategory?.sort_order ?? 0}
          >
            <InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="数值越小越靠前" />
          </Form.Item>
          <Form.Item
            name="show_in_client"
            label="是否在用户端显示"
            valuePropName="checked"
            initialValue={editingCategory?.show_in_client ?? true}
          >
            <Switch checkedChildren="显示" unCheckedChildren="隐藏" />
          </Form.Item>
        </Form>
      </Modal>
    </Spin>
  )
}
