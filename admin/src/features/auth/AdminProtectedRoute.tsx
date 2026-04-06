import { Navigate } from 'react-router-dom';
import { Center, Loader } from '@mantine/core';
import { useAdminAuth } from './useAdminAuth';

export function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAdminAuth();
  if (isLoading) return <Center h="100vh"><Loader /></Center>;
  if (!user) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}
