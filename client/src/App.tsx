import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthProvider';
import { CatalogDrawerProvider } from './context/CatalogDrawerContext';
import { ProtectedRoute } from './features/auth/ProtectedRoute';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { CatalogPage } from './features/catalog/CatalogPage';
import { ProductPage } from './features/catalog/ProductPage';
import { CartPage } from './features/cart/CartPage';
import { FavoritesPage } from './features/favorites/FavoritesPage';
import { CheckoutPage } from './features/checkout/CheckoutPage';
import { ProfilePage } from './features/profile/ProfilePage';
import { Layout } from './components/Layout';

function WithLayout({ children }: { children: React.ReactNode }) {
  return <Layout>{children}</Layout>;
}

function Protected({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute><WithLayout>{children}</WithLayout></ProtectedRoute>;
}

export default function App() {
  return (
    <AuthProvider>
      <CatalogDrawerProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/" element={<Protected><CatalogPage /></Protected>} />
        <Route path="/product/:id" element={<Protected><ProductPage /></Protected>} />
        <Route path="/cart" element={<Protected><CartPage /></Protected>} />
        <Route path="/favorites" element={<Protected><FavoritesPage /></Protected>} />
        <Route path="/checkout" element={<Protected><CheckoutPage /></Protected>} />
        <Route path="/profile" element={<Protected><ProfilePage /></Protected>} />
        <Route path="/profile/orders/:orderId" element={<Protected><ProfilePage /></Protected>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </CatalogDrawerProvider>
    </AuthProvider>
  );
}
