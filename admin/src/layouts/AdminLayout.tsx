import { Layout, Menu, Button, Space, Typography } from 'antd'
import {
  DashboardOutlined,
  ShoppingOutlined,
  AppstoreOutlined,
  FileTextOutlined,
  UserOutlined,
  HomeOutlined,
  SettingOutlined,
  LogoutOutlined,
  TagsOutlined,
  CarOutlined,
  GiftOutlined,
  ToolOutlined,
  CustomerServiceOutlined,
  TeamOutlined,
  ShopOutlined,
} from '@ant-design/icons'
import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'

const { Header, Sider, Content } = Layout

const menuItems = [
  { key: '/admin/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/admin/products', icon: <ShoppingOutlined />, label: '商品管理' },
  { key: '/admin/categories', icon: <AppstoreOutlined />, label: '分类管理' },
  { key: '/admin/spec-names', icon: <TagsOutlined />, label: '规格名称' },
  { key: '/admin/orders', icon: <FileTextOutlined />, label: '订单管理' },
  { key: '/admin/users', icon: <UserOutlined />, label: '用户管理' },
  { key: '/admin/home-config', icon: <HomeOutlined />, label: '首页配置' },
  { key: '/admin/settings', icon: <SettingOutlined />, label: '系统设置' },
  {
    key: 'retail',
    icon: <ShopOutlined />,
    label: '零售管理',
    children: [
      { key: '/admin/shipping-fees', icon: <CarOutlined />, label: '运费管理' },
      { key: '/admin/points/config', icon: <GiftOutlined />, label: '积分配置' },
      { key: '/admin/points/products', icon: <GiftOutlined />, label: '积分商品' },
      { key: '/admin/points/redeems', icon: <GiftOutlined />, label: '兑换记录' },
      { key: '/admin/points/ledger', icon: <GiftOutlined />, label: '积分流水' },
      { key: '/admin/after-sales', icon: <ToolOutlined />, label: '售后管理' },
      { key: '/admin/customer-service', icon: <CustomerServiceOutlined />, label: '客服消息' },
      { key: '/admin/retail-users', icon: <TeamOutlined />, label: '零售用户' },
      { key: '/admin/retail-home-config', icon: <HomeOutlined />, label: '零售首页配置' },
    ],
  },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const [openKeys, setOpenKeys] = useState<string[]>([])

  // 查找匹配的菜单项（支持子菜单）
  const selectedKey = (() => {
    for (const item of menuItems) {
      if ('children' in item && item.children) {
        const child = item.children.find((c: any) =>
          location.pathname.startsWith(c.key),
        )
        if (child) return child.key
      } else if (location.pathname.startsWith(item.key)) {
        return item.key
      }
    }
    return '/admin/dashboard'
  })()

  // 自动展开包含当前路由的 SubMenu
  const retailChildKeys = menuItems
    .filter((item): item is any => 'children' in item && !!item.children)
    .flatMap((item) => item.children.map((c: any) => c.key))
  if (retailChildKeys.includes(selectedKey) && !openKeys.includes('retail')) {
    setOpenKeys(['retail'])
  }

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#fff',
          padding: '0 24px',
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        <Typography.Title level={4} style={{ margin: 0 }}>
          贝壳优品百货
        </Typography.Title>
        <Space>
          <span>{user?.username}</span>
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={handleLogout}
          >
            退出
          </Button>
        </Space>
      </Header>
      <Layout>
        <Sider width={200} style={{ background: '#fff' }}>
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            openKeys={openKeys}
            onOpenChange={setOpenKeys}
            items={menuItems}
            style={{ height: '100%', borderRight: 0 }}
            onClick={({ key }) => navigate(key)}
          />
        </Sider>
        <Content style={{ padding: 24, background: '#f5f5f5' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
