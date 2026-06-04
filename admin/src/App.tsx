import { Routes, Route, Navigate } from 'react-router-dom'
import { AdminRoute } from './router/guard'
import AdminLayout from './layouts/AdminLayout'
import LoginPage from './pages/login'
import Dashboard from './pages/dashboard'
import ProductList from './pages/products/list'
import ProductEdit from './pages/products/edit'
import CategoryManage from './pages/categories'
import OrderList from './pages/orders/list'
import OrderDetail from './pages/orders/detail'
import UserManage from './pages/users'
import HomeConfig from './pages/home-config'
import SystemSettings from './pages/settings'
import SpecNames from './pages/spec-names'

export default function App() {
  return (
    <Routes>
      <Route path="/admin/login" element={<LoginPage />} />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="products" element={<ProductList />} />
        <Route path="products/edit/:id?" element={<ProductEdit />} />
        <Route path="categories" element={<CategoryManage />} />
        <Route path="orders" element={<OrderList />} />
        <Route path="orders/:id" element={<OrderDetail />} />
        <Route path="users" element={<UserManage />} />
        <Route path="home-config" element={<HomeConfig />} />
        <Route path="spec-names" element={<SpecNames />} />
        <Route path="settings" element={<SystemSettings />} />
      </Route>
      <Route path="/" element={<Navigate to="/admin/login" replace />} />
    </Routes>
  )
}
