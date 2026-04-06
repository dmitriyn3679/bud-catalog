import { Routes, Route } from 'react-router-dom';
import { Text } from '@mantine/core';

// TODO: import pages when implemented (Phase 4+)
// import { CatalogPage } from './features/catalog/CatalogPage';
// import { ProductPage } from './features/catalog/ProductPage';
// import { CartPage } from './features/cart/CartPage';
// import { FavoritesPage } from './features/favorites/FavoritesPage';
// import { CheckoutPage } from './features/checkout/CheckoutPage';
// import { LoginPage } from './features/auth/LoginPage';
// import { RegisterPage } from './features/auth/RegisterPage';
// import { ProfilePage } from './features/profile/ProfilePage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Text>Catalog — coming soon</Text>} />
    </Routes>
  );
}
