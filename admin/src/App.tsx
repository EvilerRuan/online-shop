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
// 零售管理页面
import ShippingFees from './pages/shipping-fees'
import PointsConfig from './pages/points/config'
import PointsProducts from './pages/points/products'
import PointsRedeems from './pages/points/redeems'
import PointsLedger from './pages/points/ledger'
import AfterSalesList from './pages/after-sales'
import AfterSalesDetail from './pages/after-sales/detail'
import CustomerService from './pages/customer-service'
import RetailUsers from './pages/retail-users'
import RetailHomeConfig from './pages/retail-home-config'

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
        {/* 零售管理 */}
        <Route path="shipping-fees" element={<ShippingFees />} />
        <Route path="points/config" element={<PointsConfig />} />
        <Route path="points/products" element={<PointsProducts />} />
        <Route path="points/redeems" element={<PointsRedeems />} />
        <Route path="points/ledger" element={<PointsLedger />} />
        <Route path="after-sales" element={<AfterSalesList />} />
        <Route path="after-sales/:id" element={<AfterSalesDetail />} />
        <Route path="customer-service" element={<CustomerService />} />
        <Route path="retail-users" element={<RetailUsers />} />
        <Route path="retail-home-config" element={<RetailHomeConfig />} />
      </Route>
      <Route path="/" element={<Navigate to="/admin/login" replace />} />
    </Routes>
  )
}
