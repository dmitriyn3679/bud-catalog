import { Routes, Route } from 'react-router-dom';
import { Text } from '@mantine/core';
import { AuthProvider } from './features/auth/AuthProvider';
import { ProtectedRoute } from './features/auth/ProtectedRoute';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { CatalogPage } from './features/catalog/CatalogPage';
import { ProductPage } from './features/catalog/ProductPage';
import { Layout } from './components/Layout';

// TODO Phase 5:
// import { CartPage } from './features/cart/CartPage';
// import { FavoritesPage } from './features/favorites/FavoritesPage';
// import { CheckoutPage } from './features/checkout/CheckoutPage';
// import { ProfilePage } from './features/profile/ProfilePage';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Layout wrapper */}
        <Route element={<Layout><Text /></Layout>}>
          <Route path="/" element={<Layout><CatalogPage /></Layout>} />
          <Route path="/product/:id" element={<Layout><ProductPage /></Layout>} />

          {/* Protected */}
          <Route path="/cart" element={<ProtectedRoute><Layout><Text>Cart — coming soon</Text></Layout></ProtectedRoute>} />
          <Route path="/favorites" element={<ProtectedRoute><Layout><Text>Favorites — coming soon</Text></Layout></ProtectedRoute>} />
          <Route path="/checkout" element={<ProtectedRoute><Layout><Text>Checkout — coming soon</Text></Layout></ProtectedRoute>} />
          <Route path="/profile/*" element={<ProtectedRoute><Layout><Text>Profile — coming soon</Text></Layout></ProtectedRoute>} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
