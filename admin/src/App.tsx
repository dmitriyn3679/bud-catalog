import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminAuthProvider } from './features/auth/AdminAuthProvider';
import { AdminProtectedRoute } from './features/auth/AdminProtectedRoute';
import { AdminLoginPage } from './features/auth/AdminLoginPage';
import { AdminLayout } from './components/AdminLayout';
import { ProductsPage } from './features/products/ProductsPage';
import { ProductFormPage } from './features/products/ProductFormPage';
import { OrdersPage } from './features/orders/OrdersPage';
import { OrderDetailPage } from './features/orders/OrderDetailPage';
import { StatsPage } from './features/stats/StatsPage';

export default function App() {
  return (
    <AdminAuthProvider>
      <Routes>
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route
          path="/admin/*"
          element={
            <AdminProtectedRoute>
              <AdminLayout>
                <Routes>
                  <Route index element={<Navigate to="products" replace />} />
                  <Route path="products" element={<ProductsPage />} />
                  <Route path="products/new" element={<ProductFormPage />} />
                  <Route path="products/:id/edit" element={<ProductFormPage />} />
                  <Route path="orders" element={<OrdersPage />} />
                  <Route path="orders/:id" element={<OrderDetailPage />} />
                  <Route path="stats" element={<StatsPage />} />
                </Routes>
              </AdminLayout>
            </AdminProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/admin/products" replace />} />
      </Routes>
    </AdminAuthProvider>
  );
}
