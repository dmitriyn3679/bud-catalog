import { Routes, Route } from 'react-router-dom';
import { Text } from '@mantine/core';

// TODO: import pages when implemented (Phase 6)
// import { ProductsPage } from './features/products/ProductsPage';
// import { ProductFormPage } from './features/products/ProductFormPage';
// import { OrdersPage } from './features/orders/OrdersPage';
// import { OrderDetailPage } from './features/orders/OrderDetailPage';
// import { LoginPage } from './features/auth/LoginPage';

export default function App() {
  return (
    <Routes>
      <Route path="/admin" element={<Text>Admin Dashboard — coming soon</Text>} />
    </Routes>
  );
}
